import { Lead } from '../types/workflow';

// In-memory storage for leads (in production, this would be a database)
const leads = new Map<string, Lead>();

export function submitLead(lead: Lead): { success: boolean; leadId: string; message: string } {
  leads.set(lead.id, lead);
  return {
    success: true,
    leadId: lead.id,
    message: `Lead ${lead.name} (${lead.email}) submitted successfully`,
  };
}

export function getLead(id: string): Lead | undefined {
  return leads.get(id);
}

export function getAllLeads(): Lead[] {
  return Array.from(leads.values());
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | undefined {
  const lead = leads.get(id);
  if (lead) {
    const updated = { ...lead, ...updates };
    leads.set(id, updated);
    return updated;
  }
  return undefined;
}
