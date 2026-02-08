import type { AgentTemplate, AgentInstance } from './agent-types';
import { agentSwarmManager } from './swarm-manager';

/**
 * Agent Test Result
 */
export interface AgentTestResult {
  agentId: string;
  agentName: string;
  templateId: string;
  status: 'pass' | 'fail' | 'warning';
  tests: {
    configurationValid: boolean;
    systemPromptPresent: boolean;
    capabilitiesDefined: boolean;
    modalValid: boolean;
    registeredInManager: boolean;
  };
  issues: string[];
  warnings: string[];
  metadata: {
    testedAt: Date;
    testDuration: number; // milliseconds
  };
}

/**
 * Agent Test Report
 */
export interface AgentTestReport {
  summary: {
    totalAgents: number;
    passed: number;
    failed: number;
    warnings: number;
    testDuration: number;
  };
  results: AgentTestResult[];
  generatedAt: Date;
}

/**
 * Agent Testing Service
 * 
 * Validates agent configurations, system prompts, and registry registration
 */
export class AgentTestingService {
  /**
   * Test a single agent template
   */
  testAgentTemplate(template: AgentTemplate): AgentTestResult {
    const startTime = Date.now();
    const issues: string[] = [];
    const warnings: string[] = [];

    // Test 1: Configuration validation
    const configurationValid = this.validateConfiguration(template, issues, warnings);

    // Test 2: System prompt validation
    const systemPromptPresent = this.validateSystemPrompt(template, issues, warnings);

    // Test 3: Capabilities validation
    const capabilitiesDefined = this.validateCapabilities(template, issues, warnings);

    // Test 4: Modal validation
    const modalValid = this.validateModal(template, issues, warnings);

    // Test 5: Registry validation
    const registeredInManager = this.validateRegistration(template, issues, warnings);

    const allTestsPassed = configurationValid && systemPromptPresent && 
                          capabilitiesDefined && modalValid && registeredInManager;

    const status: 'pass' | 'fail' | 'warning' = 
      !allTestsPassed ? 'fail' : 
      warnings.length > 0 ? 'warning' : 
      'pass';

    return {
      agentId: template.id,
      agentName: template.name,
      templateId: template.id,
      status,
      tests: {
        configurationValid,
        systemPromptPresent,
        capabilitiesDefined,
        modalValid,
        registeredInManager,
      },
      issues,
      warnings,
      metadata: {
        testedAt: new Date(),
        testDuration: Date.now() - startTime,
      },
    };
  }

  /**
   * Test all registered agent templates
   */
  testAllAgents(): AgentTestReport {
    const startTime = Date.now();
    const templates = agentSwarmManager.getTemplates();
    const results: AgentTestResult[] = [];

    for (const template of templates) {
      results.push(this.testAgentTemplate(template));
    }

    const summary = {
      totalAgents: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
      testDuration: Date.now() - startTime,
    };

    return {
      summary,
      results,
      generatedAt: new Date(),
    };
  }

  /**
   * Test a deployed agent instance
   */
  testAgentInstance(instance: AgentInstance): AgentTestResult {
    const template = agentSwarmManager.getTemplate(instance.templateId);
    
    if (!template) {
      return {
        agentId: instance.id,
        agentName: instance.name,
        templateId: instance.templateId,
        status: 'fail',
        tests: {
          configurationValid: false,
          systemPromptPresent: false,
          capabilitiesDefined: false,
          modalValid: false,
          registeredInManager: false,
        },
        issues: [`Template ${instance.templateId} not found`],
        warnings: [],
        metadata: {
          testedAt: new Date(),
          testDuration: 0,
        },
      };
    }

    const templateTest = this.testAgentTemplate(template);
    
    // Additional instance-specific tests
    const issues = [...templateTest.issues];
    const warnings = [...templateTest.warnings];

    if (!instance.isActive) {
      warnings.push('Agent instance is not active');
    }

    if (!instance.businessId) {
      issues.push('Agent instance is missing businessId');
    }

    return {
      ...templateTest,
      agentId: instance.id,
      agentName: instance.name,
      issues,
      warnings,
    };
  }

  /**
   * Validate agent configuration
   */
  private validateConfiguration(
    template: AgentTemplate, 
    issues: string[], 
    warnings: string[]
  ): boolean {
    if (!template.configuration) {
      warnings.push('Configuration is not defined');
      return true; // Optional, so just warn
    }

    // Check modal-specific settings
    switch (template.modal) {
      case 'voice-inbound':
      case 'voice-outbound':
        if (!template.configuration.voiceSettings) {
          warnings.push('Voice settings not configured for voice modal');
        }
        if (!template.configuration.telephonySettings) {
          warnings.push('Telephony settings not configured for voice modal');
        }
        break;
      
      case 'sms':
        if (!template.configuration.smsSettings) {
          warnings.push('SMS settings not configured for SMS modal');
        }
        break;
      
      case 'chat':
        if (!template.configuration.chatSettings) {
          warnings.push('Chat settings not configured for chat modal');
        }
        break;
    }

    return true;
  }

  /**
   * Validate system prompt
   */
  private validateSystemPrompt(
    template: AgentTemplate, 
    issues: string[], 
    warnings: string[]
  ): boolean {
    if (!template.systemPrompt || template.systemPrompt.trim().length === 0) {
      issues.push('System prompt is missing or empty');
      return false;
    }

    if (template.systemPrompt.length < 100) {
      warnings.push('System prompt is very short (< 100 characters)');
    }

    if (template.systemPrompt.length > 10000) {
      warnings.push('System prompt is very long (> 10,000 characters)');
    }

    return true;
  }

  /**
   * Validate capabilities
   */
  private validateCapabilities(
    template: AgentTemplate, 
    issues: string[], 
    warnings: string[]
  ): boolean {
    if (!template.capabilities || template.capabilities.length === 0) {
      warnings.push('No capabilities defined');
      return true; // Optional, so just warn
    }

    if (template.capabilities.length > 20) {
      warnings.push('Agent has many capabilities (> 20) - consider splitting');
    }

    return true;
  }

  /**
   * Validate modal
   */
  private validateModal(
    template: AgentTemplate, 
    issues: string[], 
    warnings: string[]
  ): boolean {
    const validModals = ['voice-inbound', 'voice-outbound', 'sms', 'chat'];
    
    if (!validModals.includes(template.modal)) {
      issues.push(`Invalid modal: ${template.modal}`);
      return false;
    }

    return true;
  }

  /**
   * Validate registration in agent manager
   */
  private validateRegistration(
    template: AgentTemplate, 
    issues: string[], 
    warnings: string[]
  ): boolean {
    const registeredTemplate = agentSwarmManager.getTemplate(template.id);
    
    if (!registeredTemplate) {
      issues.push('Agent template is not registered in AgentSwarmManager');
      return false;
    }

    // Template is registered successfully
    return true;
  }

  /**
   * Generate a human-readable test report
   */
  generateTextReport(report: AgentTestReport): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('AGENT TESTING REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(`Test Duration: ${report.summary.testDuration}ms`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(`Total Agents:   ${report.summary.totalAgents}`);
    lines.push(`Passed:         ${report.summary.passed} ✓`);
    lines.push(`Failed:         ${report.summary.failed} ✗`);
    lines.push(`Warnings:       ${report.summary.warnings} ⚠`);
    lines.push('');
    lines.push('DETAILED RESULTS');
    lines.push('-'.repeat(80));
    
    for (const result of report.results) {
      const statusSymbol = result.status === 'pass' ? '✓' : 
                          result.status === 'fail' ? '✗' : '⚠';
      
      lines.push('');
      lines.push(`${statusSymbol} ${result.agentName} (${result.agentId})`);
      lines.push(`  Template ID: ${result.templateId}`);
      lines.push(`  Status: ${result.status.toUpperCase()}`);
      lines.push(`  Test Duration: ${result.metadata.testDuration}ms`);
      lines.push('');
      lines.push('  Tests:');
      lines.push(`    Configuration Valid:     ${result.tests.configurationValid ? '✓' : '✗'}`);
      lines.push(`    System Prompt Present:   ${result.tests.systemPromptPresent ? '✓' : '✗'}`);
      lines.push(`    Capabilities Defined:    ${result.tests.capabilitiesDefined ? '✓' : '✗'}`);
      lines.push(`    Modal Valid:             ${result.tests.modalValid ? '✓' : '✗'}`);
      lines.push(`    Registered in Manager:   ${result.tests.registeredInManager ? '✓' : '✗'}`);
      
      if (result.issues.length > 0) {
        lines.push('');
        lines.push('  Issues:');
        result.issues.forEach(issue => lines.push(`    ✗ ${issue}`));
      }
      
      if (result.warnings.length > 0) {
        lines.push('');
        lines.push('  Warnings:');
        result.warnings.forEach(warning => lines.push(`    ⚠ ${warning}`));
      }
      
      lines.push('  ' + '-'.repeat(76));
    }
    
    lines.push('');
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  /**
   * Generate a markdown report
   */
  generateMarkdownReport(report: AgentTestReport): string {
    const lines: string[] = [];
    
    lines.push('# Agent Testing Report');
    lines.push('');
    lines.push(`**Generated:** ${report.generatedAt.toISOString()}`);
    lines.push(`**Test Duration:** ${report.summary.testDuration}ms`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total Agents | ${report.summary.totalAgents} |`);
    lines.push(`| ✓ Passed | ${report.summary.passed} |`);
    lines.push(`| ✗ Failed | ${report.summary.failed} |`);
    lines.push(`| ⚠ Warnings | ${report.summary.warnings} |`);
    lines.push('');
    lines.push('## Detailed Results');
    lines.push('');
    
    for (const result of report.results) {
      const statusSymbol = result.status === 'pass' ? '✓' : 
                          result.status === 'fail' ? '✗' : '⚠';
      
      lines.push(`### ${statusSymbol} ${result.agentName}`);
      lines.push('');
      lines.push(`**Agent ID:** ${result.agentId}`);
      lines.push(`**Template ID:** ${result.templateId}`);
      lines.push(`**Status:** ${result.status.toUpperCase()}`);
      lines.push(`**Test Duration:** ${result.metadata.testDuration}ms`);
      lines.push('');
      lines.push('**Tests:**');
      lines.push('');
      lines.push('| Test | Result |');
      lines.push('|------|--------|');
      lines.push(`| Configuration Valid | ${result.tests.configurationValid ? '✓' : '✗'} |`);
      lines.push(`| System Prompt Present | ${result.tests.systemPromptPresent ? '✓' : '✗'} |`);
      lines.push(`| Capabilities Defined | ${result.tests.capabilitiesDefined ? '✓' : '✗'} |`);
      lines.push(`| Modal Valid | ${result.tests.modalValid ? '✓' : '✗'} |`);
      lines.push(`| Registered in Manager | ${result.tests.registeredInManager ? '✓' : '✗'} |`);
      
      if (result.issues.length > 0) {
        lines.push('');
        lines.push('**Issues:**');
        lines.push('');
        result.issues.forEach(issue => lines.push(`- ✗ ${issue}`));
      }
      
      if (result.warnings.length > 0) {
        lines.push('');
        lines.push('**Warnings:**');
        lines.push('');
        result.warnings.forEach(warning => lines.push(`- ⚠ ${warning}`));
      }
      
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
export const agentTestingService = new AgentTestingService();
