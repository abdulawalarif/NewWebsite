"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ComplianceCertificates } from "./compliance-certificates";
import { cn } from "@/lib/utils";
import { SaillyIcon } from "./sailly-icon";
import { 
  Cloud, 
  Smartphone, 
  Globe, 
  Database,
  Zap,
  CheckCircle,
  ArrowRight,
  Settings,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  CreditCard,
  Users,
  BarChart3,
  Shield,
  Code,
  Plug,
  Rocket
} from "lucide-react";

interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "communication" | "business" | "data" | "payment";
  color: string;
  popular?: boolean;
}

interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ElementType;
  saillyState: "building" | "testing" | "deploying" | "idle";
}

const integrationOptions: IntegrationOption[] = [
  // Communication
  {
    id: "phone-systems",
    name: "Phone Systems",
    description: "Connect to existing PBX, VoIP, and telephony infrastructure",
    icon: Phone,
    category: "communication",
    color: "text-blue-600",
    popular: true
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Deploy Sailly on WhatsApp for customer messaging",
    icon: MessageSquare,
    category: "communication",
    color: "text-green-600",
    popular: true
  },
  {
    id: "web-chat",
    name: "Website Chat",
    description: "Embed Sailly directly into your website chat widget",
    icon: Globe,
    category: "communication",
    color: "text-purple-600"
  },
  {
    id: "email",
    name: "Email Integration",
    description: "Handle email inquiries with intelligent responses",
    icon: Mail,
    category: "communication",
    color: "text-orange-600"
  },

  // Business Systems
  {
    id: "salesforce",
    name: "Salesforce CRM",
    description: "Sync customer data and update records automatically",
    icon: Database,
    category: "business",
    color: "text-blue-700",
    popular: true
  },
  {
    id: "calendar",
    name: "Calendar Systems",
    description: "Book appointments across Google, Outlook, and other calendars",
    icon: Calendar,
    category: "business",
    color: "text-indigo-600",
    popular: true
  },
  {
    id: "crm-systems",
    name: "CRM Platforms",
    description: "HubSpot, Pipedrive, Zoho and 50+ other CRM systems",
    icon: Users,
    category: "business",
    color: "text-pink-600"
  },
  {
    id: "analytics",
    name: "Analytics Tools",
    description: "Track performance with Google Analytics, Mixpanel, etc.",
    icon: BarChart3,
    category: "data",
    color: "text-cyan-600"
  },

  // Payment & E-commerce
  {
    id: "stripe",
    name: "Payment Processing",
    description: "Handle payments through Stripe, PayPal, and more",
    icon: CreditCard,
    category: "payment",
    color: "text-emerald-600"
  },

  // Data & APIs
  {
    id: "databases",
    name: "Databases",
    description: "Connect to MySQL, PostgreSQL, MongoDB, and more",
    icon: Database,
    category: "data",
    color: "text-slate-600"
  },
  {
    id: "apis",
    name: "Custom APIs",
    description: "Integrate with any REST API or custom endpoints",
    icon: Code,
    category: "data",
    color: "text-gray-600"
  }
];

const deploymentSteps: DeploymentStep[] = [
  {
    id: "setup",
    title: "Initial Setup",
    description: "Configure your Sailly agent with business rules and personality",
    duration: "5 minutes",
    icon: Settings,
    saillyState: "building"
  },
  {
    id: "integrate",
    title: "Connect Systems",
    description: "Link your existing tools and databases with one-click integrations",
    duration: "10 minutes",
    icon: Plug,
    saillyState: "building"
  },
  {
    id: "test",
    title: "Test & Validate",
    description: "Run comprehensive tests to ensure everything works perfectly",
    duration: "15 minutes",
    icon: CheckCircle,
    saillyState: "testing"
  },
  {
    id: "deploy",
    title: "Go Live",
    description: "Deploy to production with zero downtime and instant activation",
    duration: "2 minutes",
    icon: Rocket,
    saillyState: "deploying"
  }
];

const categoryColors = {
  communication: "bg-blue-50 border-blue-200 text-blue-700",
  business: "bg-purple-50 border-purple-200 text-purple-700",
  data: "bg-green-50 border-green-200 text-green-700",
  payment: "bg-orange-50 border-orange-200 text-orange-700"
};

const categoryIcons = {
  communication: MessageSquare,
  business: Users,
  data: Database,
  payment: CreditCard
};

interface SaillyIntegrationSectionProps {
  className?: string;
}

export function SaillyIntegrationSection({ className }: SaillyIntegrationSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const filteredIntegrations = selectedCategory
    ? integrationOptions.filter(opt => opt.category === selectedCategory)
    : integrationOptions;

  const categories = Array.from(new Set(integrationOptions.map(opt => opt.category)));

  return (
    <div className={cn("w-full space-y-16", className)}>
      {/* Integration Options Section */}
      <div>
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full font-semibold text-sm mb-4"
          >
            <Plug className="w-4 h-4" />
            Seamless Integrations
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
          >
            Connect Sailly to Your Existing Systems
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-2xl mx-auto"
          >
            Sailly integrates with 200+ business tools and platforms. Connect your phone systems, CRM, calendars, and more with just a few clicks.
          </motion.p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-4 py-2 rounded-full border-2 transition-all duration-300",
              selectedCategory === null
                ? "bg-pink-500 border-pink-500 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
            )}
          >
            All Integrations
          </button>
          {categories.map((category) => {
            const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-300 capitalize",
                  selectedCategory === category
                    ? "bg-pink-500 border-pink-500 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}
              >
                <IconComponent className="w-4 h-4" />
                {category}
              </button>
            );
          })}
        </div>

        {/* Integration Grid */}
        <motion.div 
          layout
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredIntegrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative p-6 rounded-2xl border-2 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer",
                categoryColors[integration.category]
              )}
            >
              {integration.popular && (
                <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Popular
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  "bg-white shadow-sm"
                )}>
                  {(() => {
                    const IconComponent = integration.icon as React.ComponentType<{ className?: string }>;
                    return <IconComponent className={cn("w-6 h-6", integration.color)} />;
                  })()}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">{integration.name}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{integration.description}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {integration.category}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Deployment Process Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border-2 border-gray-200">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold text-sm mb-4"
          >
            <Rocket className="w-4 h-4" />
            Quick Deployment
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
          >
            From Setup to Live in 30 Minutes
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-xl mx-auto"
          >
            Our streamlined deployment process gets your Sailly agent up and running quickly, with comprehensive testing to ensure everything works perfectly.
          </motion.p>
        </div>

        {/* Deployment Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {deploymentSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveStep(index)}
              className={cn(
                "relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md",
                activeStep === index
                  ? "bg-pink-50 border-pink-300 shadow-md"
                  : "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              {/* Step Number */}
              <div className={cn(
                "absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-sm shadow-lg",
                activeStep === index ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600"
              )}>
                {index + 1}
              </div>

              {/* Icon */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                activeStep === index ? "bg-pink-100 text-pink-600" : "bg-gray-50 text-gray-600"
              )}>
                {(() => {
                  const IconComponent = step.icon as React.ComponentType<{ className?: string }>;
                  return <IconComponent className="w-6 h-6" />;
                })()}
              </div>

              {/* Content */}
              <h4 className={cn(
                "font-bold text-lg mb-2",
                activeStep === index ? "text-pink-700" : "text-gray-900"
              )}>
                {step.title}
              </h4>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {step.description}
              </p>
              <div className="text-xs font-medium text-gray-500">
                ⏱️ {step.duration}
              </div>

              {/* Active Sailly */}
              {activeStep === index && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-2 -left-2"
                >
                  <SaillyIcon 
                    size="sm" 
                    state={step.saillyState}
                    showStatusIndicator
                  />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Connection Lines */}
        <div className="hidden lg:block relative -mt-16 mb-8">
          <div className="flex items-center justify-between px-16">
            {deploymentSteps.slice(0, -1).map((_, index) => (
              <motion.div
                key={index}
                className="flex-1 flex items-center justify-center"
              >
                <motion.div
                  className={cn(
                    "h-0.5 flex-1 transition-colors duration-500",
                    activeStep > index ? "bg-pink-400" : "bg-gray-300"
                  )}
                />
                <motion.div
                  animate={{
                    x: activeStep === index ? [0, 20, 0] : 0,
                    opacity: activeStep === index ? [1, 0.5, 1] : 0.3
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight className={cn(
                    "w-4 h-4 mx-4",
                    activeStep > index ? "text-pink-400" : "text-gray-300"
                  )} />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-900">Maximum Security</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                DSGVO-konform
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                ISO 27001 Informationssicherheit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                EU AI Act konform
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                End-to-end Encryption
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Regular Security Audits
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900">Cloud Infrastructure</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                99.9% Uptime SLA
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Global CDN Network
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Auto-scaling Infrastructure
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                24/7 Monitoring & Support
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100">
          <ComplianceCertificates size="sm" />
        </div>
      </div>
    </div>
  );
}