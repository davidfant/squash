/**
 * TypeScript definitions for CRM-specific content
 */

export interface Integrations {
  name: string;
  logo: string;
}

export interface HeroContent {
  badge: string;
  heading: string;
  description: string;
  integrations: Integrations[];
}

export interface WorkflowNode {
  id: string;
  title: string;
  description: string;
  parentId?: string;
  logo?: string;
}

export interface WorkflowStep {
  title: string;
  description: string;
}

export interface WorkflowContent {
  description: string;
  steps: WorkflowStep[];
  nodes: Array<{
    id: string;
    parentId?: string;
    title: string;
    description: string;
    logo?: string;
  }>;
}

export interface CallToActionContent {
  title: string;
  description: string;
}

export interface Testimonial {
  role: string;
  content: string;
}

export interface AdContent {
  slug: string;
  hero: HeroContent;
  workflow: WorkflowContent;
  callToAction: CallToActionContent;
  testimonials: {
    description: string;
    testimonials: Testimonial[];
  };
  usps: string[];
}
