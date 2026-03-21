import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateDocument } from '@/lib/anthropic';
import type {
  Organization,
  Property,
  DocumentTemplate,
  Document,
} from '@/lib/types';
import { DOCUMENT_TYPES } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document_type, property_id, jurisdiction } = body as {
      document_type: string;
      property_id?: string;
      jurisdiction: string;
    };

    // Validate required fields
    if (!document_type || !jurisdiction) {
      return NextResponse.json(
        { error: 'document_type and jurisdiction are required' },
        { status: 400 },
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single<Organization>();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Look up matching template
    const serviceClient = createServiceClient();
    const { data: template, error: templateError } = await serviceClient
      .from('document_templates')
      .select('*')
      .eq('document_type', document_type)
      .eq('jurisdiction', jurisdiction)
      .eq('is_active', true)
      .single<DocumentTemplate>();

    if (templateError || !template) {
      return NextResponse.json(
        {
          error: `No active template found for ${document_type} in ${jurisdiction}`,
        },
        { status: 404 },
      );
    }

    // Look up property if provided
    let property: Property | null = null;
    if (property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('*')
        .eq('id', property_id)
        .eq('org_id', org.id)
        .single<Property>();

      if (!prop) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 },
        );
      }
      property = prop;
    }

    // Generate document via Anthropic
    const contentMarkdown = await generateDocument(template, org, property);

    // Determine category from document type config
    const docTypeConfig =
      DOCUMENT_TYPES[document_type as keyof typeof DOCUMENT_TYPES];
    const category = docTypeConfig?.category ?? 'federal';

    // Save to documents table
    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        org_id: org.id,
        property_id: property_id || null,
        title: template.title,
        document_type,
        category,
        jurisdiction,
        status: 'draft',
        content_markdown: contentMarkdown,
        version: 1,
        regulation_references: template.regulation_references,
        generated_by: 'ai',
      })
      .select()
      .single<Document>();

    if (insertError || !doc) {
      console.error('Failed to save document:', insertError);
      return NextResponse.json(
        { error: 'Failed to save generated document' },
        { status: 500 },
      );
    }

    // Log to audit_log
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user.id,
      action: 'document_generated',
      entity_type: 'document',
      entity_id: doc.id,
      metadata: {
        document_type,
        jurisdiction,
        template_id: template.id,
        property_id: property_id || null,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during document generation' },
      { status: 500 },
    );
  }
}
