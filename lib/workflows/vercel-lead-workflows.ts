/**
 * Lead processing workflows using Vercel Workflow DevKit
 *
 * This module defines durable, observable workflows for lead processing.
 * Each workflow uses the "use workflow" directive for durability.
 * Each step uses the "use step" directive for automatic retries.
 */

import { Lead } from '../types/workflow';
import { sleep } from 'workflow';

// Configurable delays for visibility (can be disabled via env var)
const ENABLE_DELAYS = process.env.WORKFLOW_ENABLE_DELAYS !== 'false';
const STEP_DELAYS = {
  short: 2000,   // 2 seconds
  medium: 2500,  // 2.5 seconds
  long: 3000,    // 3 seconds
};

// ============================================================================
// Step Functions (with "use step" directive for automatic retries)
// ============================================================================

async function validateEmailStep(lead: Lead): Promise<{ valid: boolean; reason?: string }> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.medium);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(lead.email);

  return {
    valid,
    reason: valid ? 'Email format is valid' : 'Invalid email format'
  };
}

async function validateDomainStep(email: string): Promise<{ valid: boolean; domain: string }> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.short);
  }

  const domain = email.split('@')[1] || '';
  // In production, this would check DNS records
  const valid = domain.length > 0;

  return { valid, domain };
}

async function finalizeValidationStep(): Promise<{ validated: boolean }> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.short);
  }

  return { validated: true };
}

async function enrichLeadStep(lead: Lead): Promise<Record<string, unknown>> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.long);
  }

  // Simulate enrichment with external data
  const mockEnrichment = {
    companyInfo: lead.company ? `${lead.company} is a technology company` : 'Unknown company',
    industry: 'Technology',
    companySize: '50-200 employees',
    location: 'San Francisco, CA'
  };

  return mockEnrichment;
}

async function enrichProfileStep(): Promise<{ enriched: boolean }> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.medium);
  }

  return { enriched: true };
}

async function updateRecordStep(): Promise<{ updated: boolean }> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.short);
  }

  return { updated: true };
}

async function gatherLeadDataStep(lead: Lead): Promise<Record<string, unknown>> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.short);
  }

  return lead.enrichmentDetails || {};
}

async function calculateScoreStep(lead: Lead, enrichmentData: Record<string, unknown>): Promise<number> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.medium);
  }

  let score = 0;

  // Scoring logic
  if (lead.email && lead.email.includes('@')) score += 20;
  if (lead.name) score += 15;
  if (lead.company) score += 25;
  if (lead.phone) score += 10;
  if (enrichmentData?.companySize) score += 15;
  if (enrichmentData?.industry === 'Technology') score += 15;

  return Math.min(score, 100);
}

async function determineQualificationStep(score: number): Promise<{ qualified: boolean; threshold: number }> {
  'use step';

  if (ENABLE_DELAYS) {
    await sleep(STEP_DELAYS.short);
  }

  const qualified = score >= 60;

  return { qualified, threshold: 60 };
}

// ============================================================================
// Workflow Functions (with "use workflow" directive for durability)
// ============================================================================

/**
 * Validate a lead by checking email format and domain validity
 */
export async function validateLead(leadId: string, lead: Lead) {
  'use workflow';

  const emailResult = await validateEmailStep(lead);

  if (!emailResult.valid) {
    throw new Error(emailResult.reason || 'Email validation failed');
  }

  const domainResult = await validateDomainStep(lead.email);
  const finalResult = await finalizeValidationStep();

  return {
    validated: true,
    email: emailResult,
    domain: domainResult,
    final: finalResult,
  };
}

/**
 * Enrich a lead with additional company information and data
 */
export async function enrichLead(leadId: string, lead: Lead) {
  'use workflow';

  const companyData = await enrichLeadStep(lead);
  const profileResult = await enrichProfileStep();
  const recordResult = await updateRecordStep();

  return {
    ...companyData,
    enriched: profileResult.enriched,
    updated: recordResult.updated,
  };
}

/**
 * Score a lead based on available data and determine qualification
 */
export async function scoreLead(leadId: string, lead: Lead) {
  'use workflow';

  const enrichmentData = await gatherLeadDataStep(lead);
  const score = await calculateScoreStep(lead, enrichmentData);
  const qualificationResult = await determineQualificationStep(score);

  return {
    score,
    qualified: qualificationResult.qualified,
    threshold: qualificationResult.threshold,
  };
}

/**
 * Process a lead through the complete workflow: validate, enrich, and score
 */
export async function processLead(leadId: string, lead: Lead) {
  'use workflow';

  // Step 1: Validate
  const validationResult = await validateLead(leadId, lead);

  // Step 2: Enrich
  const enrichmentResult = await enrichLead(leadId, lead);

  // Step 3: Score with enrichment data
  const leadWithEnrichment: Lead = {
    ...lead,
    enrichmentDetails: enrichmentResult as Record<string, unknown>,
  };
  const scoringResult = await scoreLead(leadId, leadWithEnrichment);

  return {
    validation: validationResult,
    enrichment: enrichmentResult,
    scoring: scoringResult,
  };
}
