import * as fs from 'fs';
import * as path from 'path';
import * as nodeSchedule from 'node-schedule';
import { glob } from 'glob';
import { storage } from '../storage';
import { 
  TriggerType, 
  WorkflowStepType, 
  WorkflowStatus,
  AutomationWorkflow,
  ScheduleConfig
} from '@shared/schema';
import OpenAI from "openai";
import { HfInference } from "@huggingface/inference";

// Initialize AI clients if API keys are available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

// Define job schedule type
interface ScheduledJob {
  workflow: AutomationWorkflow;
  job: nodeSchedule.Job;
}

class AutomationService {
  // Keep track of scheduled jobs
  private scheduledJobs: Map<number, nodeSchedule.Job> = new Map();
  private userId: number = 1; // Default user id, will be set per user session
  private isInitialized: boolean = false;

  /**
   * Initialize the automation service by scheduling active workflows
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing automation service...");
      
      try {
        // Get all active automation workflows
        const activeWorkflows = await storage.getActiveAutomationWorkflows(this.userId);
        
        console.log(`Found ${activeWorkflows.length} active automation workflows to initialize`);
        
        // Schedule each active workflow
        for (const workflow of activeWorkflows) {
          if (workflow.triggerType === TriggerType.SCHEDULE && workflow.isActive) {
            await this.scheduleWorkflow(workflow);
          }
        }
        
        this.isInitialized = true;
        console.log("Automation service initialized successfully");
      } catch (err) {
        console.error("Error initializing automation workflows:", err);
      }
    } catch (error) {
      console.error("Failed to initialize automation service:", error);
      throw error;
    }
  }

  /**
   * Set the current user for the service
   */
  setUserId(userId: number): void {
    this.userId = userId;
  }

  /**
   * Schedule a workflow based on its schedule configuration
   */
  async scheduleWorkflow(workflow: AutomationWorkflow): Promise<boolean> {
    try {
      // Cancel any existing schedule for this workflow
      this.cancelSchedule(workflow.id);
      
      // Skip workflows that aren't scheduled or active
      if (workflow.triggerType !== TriggerType.SCHEDULE || !workflow.isActive) {
        console.log(`Workflow ${workflow.id} is not a scheduled workflow or not active, skipping`);
        return false;
      }
      
      console.log(`Scheduling workflow ${workflow.id}: ${workflow.name}`);
      
      // Parse schedule config
      const scheduleConfig: ScheduleConfig = workflow.triggerConfig 
        ? JSON.parse(workflow.triggerConfig) 
        : null;
      
      if (!scheduleConfig) {
        console.error(`No schedule configuration found for workflow ${workflow.id}`);
        return false;
      }
      
      let scheduleRule;
      
      // Create schedule rule based on config type
      switch (scheduleConfig.type) {
        case 'cron':
          // Use the cron expression directly
          scheduleRule = scheduleConfig.cron;
          break;
          
        case 'interval':
          // Create a rule for the interval
          const now = new Date();
          const minutes = scheduleConfig.minutes || 0;
          const hours = scheduleConfig.hours || 0;
          const days = scheduleConfig.days || 0;
          
          // Convert to milliseconds
          const intervalMs = 
            (minutes * 60 * 1000) + 
            (hours * 60 * 60 * 1000) + 
            (days * 24 * 60 * 60 * 1000);
          
          if (intervalMs < 60000) { // Minimum 1 minute
            console.error(`Interval for workflow ${workflow.id} is too short (minimum 1 minute)`);
            return false;
          }
          
          // Use recurrence rule for interval
          const rule = new nodeSchedule.RecurrenceRule();
          rule.second = 0; // Run at the top of the minute
          
          scheduleRule = rule;
          break;
          
        case 'daily':
          // Set up daily schedule at the specified time
          const dailyRule = new nodeSchedule.RecurrenceRule();
          dailyRule.hour = scheduleConfig.hour || 0;
          dailyRule.minute = scheduleConfig.minute || 0;
          dailyRule.second = 0;
          
          scheduleRule = dailyRule;
          break;
          
        case 'weekly':
          // Set up weekly schedule on the specified day and time
          const weeklyRule = new nodeSchedule.RecurrenceRule();
          weeklyRule.dayOfWeek = scheduleConfig.dayOfWeek || 0; // Sunday by default
          weeklyRule.hour = scheduleConfig.hour || 0;
          weeklyRule.minute = scheduleConfig.minute || 0;
          weeklyRule.second = 0;
          
          scheduleRule = weeklyRule;
          break;
          
        case 'monthly':
          // Set up monthly schedule on the specified day and time
          const monthlyRule = new nodeSchedule.RecurrenceRule();
          monthlyRule.date = scheduleConfig.day || 1; // First day of the month by default
          monthlyRule.hour = scheduleConfig.hour || 0;
          monthlyRule.minute = scheduleConfig.minute || 0;
          monthlyRule.second = 0;
          
          scheduleRule = monthlyRule;
          break;
          
        default:
          console.error(`Unknown schedule type for workflow ${workflow.id}: ${scheduleConfig.type}`);
          return false;
      }
      
      if (!scheduleRule) {
        console.error(`Failed to create schedule rule for workflow ${workflow.id}`);
        return false;
      }
      
      // Update the workflow last run time
      await storage.updateAutomationWorkflow(workflow.id, {
        lastRunAt: new Date()
      });
      
      // Schedule the job
      const job = nodeSchedule.scheduleJob(scheduleRule, async () => {
        console.log(`Running scheduled workflow ${workflow.id}: ${workflow.name}`);
        
        // Execute the workflow
        await this.executeWorkflow(workflow.id, {
          source: 'schedule',
          timestamp: new Date(),
          userId: this.userId,
          data: {}
        });
      });
      
      // Store the job for future reference
      this.scheduledJobs.set(workflow.id, job);
      
      console.log(`Scheduled workflow ${workflow.id}: ${workflow.name} successfully`);
      return true;
    } catch (error) {
      console.error(`Error scheduling workflow ${workflow.id}:`, error);
      return false;
    }
  }

  /**
   * Cancel a scheduled workflow
   */
  cancelSchedule(workflowId: number): boolean {
    try {
      const job = this.scheduledJobs.get(workflowId);
      
      if (job) {
        job.cancel();
        this.scheduledJobs.delete(workflowId);
        console.log(`Cancelled schedule for workflow ${workflowId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error cancelling schedule for workflow ${workflowId}:`, error);
      return false;
    }
  }

  /**
   * Cancel all scheduled workflows
   */
  cancelAllSchedules(): void {
    try {
      for (const [workflowId, job] of this.scheduledJobs) {
        job.cancel();
        console.log(`Cancelled schedule for workflow ${workflowId}`);
      }
      
      this.scheduledJobs.clear();
      console.log('Cancelled all scheduled workflows');
    } catch (error) {
      console.error('Error cancelling all scheduled workflows:', error);
    }
  }

  /**
   * Trigger workflows by event type
   */
  async triggerWorkflowsByEvent(
    triggerType: TriggerType,
    eventData: any,
    userId: number = this.userId
  ): Promise<number> {
    try {
      // Get all active workflows for this trigger type
      const workflows = await storage.getAutomationWorkflowsByTriggerType(userId, triggerType);
      
      console.log(`Found ${workflows.length} workflows for trigger type ${triggerType}`);
      
      // Filter to active workflows
      const activeWorkflows = workflows.filter(workflow => workflow.isActive);
      
      console.log(`${activeWorkflows.length} active workflows for trigger type ${triggerType}`);
      
      if (activeWorkflows.length === 0) {
        return 0;
      }
      
      // Trigger each workflow
      let triggeredCount = 0;
      
      for (const workflow of activeWorkflows) {
        try {
          // Check if this workflow should be triggered based on trigger config
          const shouldTrigger = await this.checkTriggerConditions(workflow, eventData);
          
          if (!shouldTrigger) {
            console.log(`Skipping workflow ${workflow.id} based on trigger conditions`);
            continue;
          }
          
          // Execute the workflow
          await this.executeWorkflow(workflow.id, {
            source: 'event',
            timestamp: new Date(),
            userId,
            data: eventData
          });
          
          triggeredCount++;
        } catch (triggerError) {
          console.error(`Error triggering workflow ${workflow.id}:`, triggerError);
        }
      }
      
      return triggeredCount;
    } catch (error) {
      console.error(`Error triggering workflows for event type ${triggerType}:`, error);
      return 0;
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: number,
    context: {
      source: string;
      timestamp: Date;
      userId: number;
      data: any;
    }
  ): Promise<any> {
    try {
      // Get the workflow
      const workflow = await storage.getAutomationWorkflow(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      
      console.log(`Executing workflow ${workflowId}: ${workflow.name}`);
      
      // Create execution record
      const execution = await storage.createWorkflowExecution({
        workflowId,
        userId: context.userId,
        status: WorkflowStatus.RUNNING,
        startTime: new Date(),
        triggerSource: context.source,
        triggerData: context.data
      });
      
      const executionId = execution.id;
      
      // Parse workflow steps
      const steps = workflow.steps ? JSON.parse(workflow.steps.toString()) : [];
      
      if (steps.length === 0) {
        await storage.updateWorkflowExecution(executionId, {
          status: WorkflowStatus.COMPLETED,
          endTime: new Date(),
          logs: JSON.stringify({
            context,
            steps: [],
            outputs: {},
            result: {
              success: true,
              message: 'Workflow has no steps to execute'
            }
          })
        });
        
        return {
          success: true,
          message: 'Workflow has no steps to execute',
          executionId
        };
      }
      
      const executionData = {
        context,
        steps: [],
        outputs: {}
      };
      
      // Execute each step in sequence
      let currentStepIndex = 0;
      let allStepsSuccessful = true;
      
      for (const step of steps) {
        try {
          console.log(`Executing step ${currentStepIndex + 1} of ${steps.length}: ${step.name}`);
          
          // Update execution record with current step
          await storage.updateWorkflowExecution(executionId, {
            logs: JSON.stringify({
              ...executionData,
              currentStep: currentStepIndex + 1,
              totalSteps: steps.length
            })
          });
          
          // Execute the step
          const stepResult = await this.executeWorkflowStep(step, executionData, workflow);
          
          // Store the step result
          executionData.steps.push({
            index: currentStepIndex,
            name: step.name,
            type: step.type,
            status: stepResult.success ? 'completed' : 'failed',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 0,
            result: stepResult
          });
          
          // Store step output if it was successful
          if (stepResult.success && step.outputName && stepResult.output) {
            executionData.outputs[step.outputName] = stepResult.output;
          }
          
          // If the step failed, mark the workflow as failed
          if (!stepResult.success) {
            allStepsSuccessful = false;
            
            await storage.updateWorkflowExecution(executionId, {
              status: WorkflowStatus.FAILED,
              endTime: new Date(),
              logs: JSON.stringify({
                ...executionData,
                result: {
                  success: false,
                  message: `Step ${currentStepIndex + 1} failed: ${stepResult.error || 'Unknown error'}`
                }
              })
            });
            
            return {
              success: false,
              message: `Step ${currentStepIndex + 1} failed: ${stepResult.error || 'Unknown error'}`,
              executionId
            };
          }
          
          currentStepIndex++;
        } catch (stepError) {
          // Handle step execution error
          allStepsSuccessful = false;
          
          await storage.updateWorkflowExecution(executionId, {
            status: WorkflowStatus.FAILED,
            endTime: new Date(),
            logs: JSON.stringify({
              ...executionData,
              result: {
                success: false,
                message: `Error in step ${currentStepIndex + 1}: ${stepError}`
              }
            })
          });
          
          return {
            success: false,
            message: `Error in step ${currentStepIndex + 1}: ${stepError}`,
            executionId
          };
        }
      }
      
      // All steps completed successfully
      if (allStepsSuccessful) {
        await storage.updateWorkflowExecution(executionId, {
          status: WorkflowStatus.COMPLETED,
          endTime: new Date(),
          logs: JSON.stringify({
            ...executionData,
            result: {
              success: true,
              message: 'Workflow completed successfully'
            }
          })
        });
        
        return {
          success: true,
          message: 'Workflow completed successfully',
          outputs: executionData.outputs,
          executionId
        };
      }
    } catch (executionError) {
      // Handle workflow execution error
      console.error(`Error executing workflow ${workflowId}:`, executionError);
      
      // Try to update the execution record if we have it
      try {
        const executions = await storage.getWorkflowExecution(workflowId);
        
        if (executions) {
          await storage.updateWorkflowExecution(executions.id, {
            status: WorkflowStatus.FAILED,
            endTime: new Date(),
            logs: JSON.stringify({
              context,
              result: {
                success: false,
                message: `Workflow execution error: ${executionError}`
              }
            })
          });
        }
      } catch (updateError) {
        console.error(`Error updating workflow execution for ${workflowId}:`, updateError);
      }
      
      return {
        success: false,
        message: `Workflow execution error: ${executionError}`
      };
    }
  }

  /**
   * Check if a workflow should be triggered based on trigger conditions
   */
  private async checkTriggerConditions(workflow: AutomationWorkflow, eventData: any): Promise<boolean> {
    try {
      // If no trigger config, always trigger
      if (!workflow.triggerConfig) {
        return true;
      }
      
      const triggerConfig = JSON.parse(workflow.triggerConfig);
      
      // Handle different trigger types
      switch (workflow.triggerType) {
        case TriggerType.FILE_EVENT:
          return this.checkFileEventTriggerConditions(triggerConfig, eventData);
          
        case TriggerType.MANUAL:
          return true; // Manual triggers always run when requested
          
        case TriggerType.SCHEDULE:
          return true; // Schedule triggers are handled by the scheduler
          
        case TriggerType.API:
          return this.checkApiTriggerConditions(triggerConfig, eventData);
          
        default:
          console.log(`Unknown trigger type: ${workflow.triggerType}`);
          return false;
      }
    } catch (error) {
      console.error(`Error checking trigger conditions for workflow ${workflow.id}:`, error);
      return false;
    }
  }

  /**
   * Check file event trigger conditions
   */
  private async checkFileEventTriggerConditions(triggerConfig: any, eventData: any): Promise<boolean> {
    try {
      // If no event type specified, allow all events
      if (!triggerConfig.eventTypes || triggerConfig.eventTypes.length === 0) {
        return true;
      }
      
      // Check if the event type matches
      if (!triggerConfig.eventTypes.includes(eventData.eventType)) {
        return false;
      }
      
      // Check file path patterns if specified
      if (triggerConfig.pathPatterns && triggerConfig.pathPatterns.length > 0) {
        let matchesPattern = false;
        
        for (const pattern of triggerConfig.pathPatterns) {
          if (eventData.filePath.includes(pattern) || await this.matchGlobPattern(eventData.filePath, pattern)) {
            matchesPattern = true;
            break;
          }
        }
        
        if (!matchesPattern) {
          return false;
        }
      }
      
      // Check file extensions if specified
      if (triggerConfig.fileExtensions && triggerConfig.fileExtensions.length > 0) {
        const fileExt = path.extname(eventData.filePath).toLowerCase().substring(1);
        if (!triggerConfig.fileExtensions.includes(fileExt)) {
          return false;
        }
      }
      
      // All conditions passed
      return true;
    } catch (error) {
      console.error('Error checking file event trigger conditions:', error);
      return false;
    }
  }

  /**
   * Check API trigger conditions
   */
  private checkApiTriggerConditions(triggerConfig: any, eventData: any): boolean {
    try {
      // Check endpoint if specified
      if (triggerConfig.endpoint && triggerConfig.endpoint !== eventData.endpoint) {
        return false;
      }
      
      // Check HTTP method if specified
      if (triggerConfig.method && triggerConfig.method !== eventData.method) {
        return false;
      }
      
      // All conditions passed
      return true;
    } catch (error) {
      console.error('Error checking API trigger conditions:', error);
      return false;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    step: any,
    executionData: any,
    workflow: AutomationWorkflow
  ): Promise<any> {
    try {
      console.log(`Executing workflow step: ${step.name}, type: ${step.type}`);
      
      switch (step.type) {
        case WorkflowStepType.FILE_OPERATION:
          return await this.executeFileOperationStep(step, executionData);
          
        case WorkflowStepType.HTTP_REQUEST:
          return await this.executeHttpRequestStep(step, executionData);
          
        case WorkflowStepType.SCRIPT:
          return await this.executeScriptStep(step, executionData);
          
        case WorkflowStepType.CONDITIONAL:
          return await this.executeConditionalStep(step, executionData);
          
        case WorkflowStepType.FILE_IMPORT:
          return await this.executeFileImportStep(step, executionData);
          
        case WorkflowStepType.FILE_EXPORT:
          return await this.executeFileExportStep(step, executionData);
          
        case WorkflowStepType.DATA_TRANSFORM:
          return await this.executeDataTransformStep(step, executionData);
          
        case WorkflowStepType.AI_ANALYSIS:
          return await this.executeAiAnalysisStep(step, executionData);
          
        case WorkflowStepType.DATABASE_OPERATION:
          return await this.executeDatabaseOperationStep(step, executionData);
          
        case WorkflowStepType.NOTIFICATION:
          return await this.executeNotificationStep(step, executionData);
          
        default:
          return {
            success: false,
            error: `Unknown step type: ${step.type}`
          };
      }
    } catch (error) {
      console.error(`Error executing workflow step ${step.name}:`, error);
      return {
        success: false,
        error: `Step execution error: ${error}`
      };
    }
  }

  /**
   * Execute a file operation step
   */
  private async executeFileOperationStep(step: any, executionData: any): Promise<any> {
    try {
      const { operation, sourcePath, targetPath } = step.config;
      
      // Process template variables in paths
      const resolvedSourcePath = this.processTemplate(sourcePath, executionData);
      const resolvedTargetPath = targetPath ? this.processTemplate(targetPath, executionData) : null;
      
      console.log(`File operation: ${operation}, source: ${resolvedSourcePath}, target: ${resolvedTargetPath}`);
      
      switch (operation) {
        case 'copy':
          if (!resolvedTargetPath) {
            return {
              success: false,
              error: 'Target path is required for copy operation'
            };
          }
          
          // Ensure target directory exists
          const targetDir = path.dirname(resolvedTargetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // Copy the file
          fs.copyFileSync(resolvedSourcePath, resolvedTargetPath);
          
          return {
            success: true,
            message: `File copied from ${resolvedSourcePath} to ${resolvedTargetPath}`,
            output: resolvedTargetPath
          };
          
        case 'move':
          if (!resolvedTargetPath) {
            return {
              success: false,
              error: 'Target path is required for move operation'
            };
          }
          
          // Ensure target directory exists
          const moveTargetDir = path.dirname(resolvedTargetPath);
          if (!fs.existsSync(moveTargetDir)) {
            fs.mkdirSync(moveTargetDir, { recursive: true });
          }
          
          // Move the file
          fs.renameSync(resolvedSourcePath, resolvedTargetPath);
          
          return {
            success: true,
            message: `File moved from ${resolvedSourcePath} to ${resolvedTargetPath}`,
            output: resolvedTargetPath
          };
          
        case 'delete':
          // Delete the file
          fs.unlinkSync(resolvedSourcePath);
          
          return {
            success: true,
            message: `File deleted: ${resolvedSourcePath}`
          };
          
        case 'read':
          // Read the file content
          const content = fs.readFileSync(resolvedSourcePath, 'utf8');
          
          return {
            success: true,
            message: `File read: ${resolvedSourcePath}`,
            output: content
          };
          
        case 'write':
          // Write content to the file
          const writeContent = this.processTemplate(step.config.content, executionData);
          
          // Ensure directory exists
          const writeDir = path.dirname(resolvedSourcePath);
          if (!fs.existsSync(writeDir)) {
            fs.mkdirSync(writeDir, { recursive: true });
          }
          
          // Write the file
          fs.writeFileSync(resolvedSourcePath, writeContent);
          
          return {
            success: true,
            message: `File written: ${resolvedSourcePath}`,
            output: resolvedSourcePath
          };
          
        case 'append':
          // Append content to the file
          const appendContent = this.processTemplate(step.config.content, executionData);
          
          // Ensure directory exists
          const appendDir = path.dirname(resolvedSourcePath);
          if (!fs.existsSync(appendDir)) {
            fs.mkdirSync(appendDir, { recursive: true });
          }
          
          // Append to the file
          fs.appendFileSync(resolvedSourcePath, appendContent);
          
          return {
            success: true,
            message: `Content appended to file: ${resolvedSourcePath}`,
            output: resolvedSourcePath
          };
          
        default:
          return {
            success: false,
            error: `Unknown file operation: ${operation}`
          };
      }
    } catch (error) {
      console.error('Error executing file operation step:', error);
      return {
        success: false,
        error: `File operation error: ${error}`
      };
    }
  }

  /**
   * Execute an HTTP request step
   */
  private async executeHttpRequestStep(step: any, executionData: any): Promise<any> {
    try {
      const { url, method, headers, body, timeoutMs } = step.config;
      
      // Process template variables
      const resolvedUrl = this.processTemplate(url, executionData);
      const resolvedMethod = method ? this.processTemplate(method, executionData) : 'GET';
      
      // Process headers if present
      let resolvedHeaders = {};
      if (headers) {
        for (const key in headers) {
          resolvedHeaders[key] = this.processTemplate(headers[key], executionData);
        }
      }
      
      // Process body if present
      let resolvedBody = null;
      if (body) {
        resolvedBody = this.processTemplate(body, executionData);
        
        // If the body is a JSON string, parse it
        try {
          resolvedBody = JSON.parse(resolvedBody);
        } catch (parseError) {
          // If parsing fails, use the string as is
          console.log('Body is not valid JSON, using as raw string');
        }
      }
      
      console.log(`HTTP request: ${resolvedMethod} ${resolvedUrl}`);
      
      // Set up fetch options
      const fetchOptions: RequestInit = {
        method: resolvedMethod,
        headers: resolvedHeaders,
        timeout: timeoutMs || 30000
      };
      
      // Add body for non-GET requests
      if (resolvedMethod !== 'GET' && resolvedBody) {
        if (typeof resolvedBody === 'string') {
          fetchOptions.body = resolvedBody;
        } else {
          fetchOptions.body = JSON.stringify(resolvedBody);
          
          // Set content-type to JSON if not specified
          if (!resolvedHeaders['content-type'] && !resolvedHeaders['Content-Type']) {
            resolvedHeaders['Content-Type'] = 'application/json';
          }
        }
      }
      
      // Make the request
      const response = await fetch(resolvedUrl, fetchOptions);
      
      // Get response data
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      // Create response object
      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      };
      
      // Check if successful based on status code
      const isSuccess = response.status >= 200 && response.status < 300;
      
      return {
        success: isSuccess,
        message: isSuccess ? 'HTTP request completed successfully' : `HTTP request failed with status ${response.status}`,
        output: result,
        error: isSuccess ? null : `HTTP request failed with status ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      console.error('Error executing HTTP request step:', error);
      return {
        success: false,
        error: `HTTP request error: ${error}`
      };
    }
  }

  /**
   * Execute a script step
   */
  private async executeScriptStep(step: any, executionData: any): Promise<any> {
    try {
      const { script, scriptType } = step.config;
      
      // Process template variables in script
      const resolvedScript = this.processTemplate(script, executionData);
      
      console.log(`Executing script of type: ${scriptType}`);
      
      // Create context for the script with execution data
      const scriptContext = {
        executionData,
        outputs: executionData.outputs,
        inputs: step.config.inputs ? JSON.parse(this.processTemplate(JSON.stringify(step.config.inputs), executionData)) : {},
        console: {
          log: (...args) => console.log('Script log:', ...args),
          error: (...args) => console.error('Script error:', ...args)
        },
        process: {
          env: process.env
        },
        require: require
      };
      
      // Execute the script based on type
      let result;
      switch (scriptType) {
        case 'javascript':
          // Create a function from the script
          const scriptFn = new Function('context', resolvedScript);
          
          // Execute the function with the context
          result = scriptFn(scriptContext);
          
          // Handle promises
          if (result instanceof Promise) {
            result = await result;
          }
          
          break;
          
        default:
          return {
            success: false,
            error: `Unsupported script type: ${scriptType}`
          };
      }
      
      return {
        success: true,
        message: 'Script executed successfully',
        output: result
      };
    } catch (error) {
      console.error('Error executing script step:', error);
      return {
        success: false,
        error: `Script execution error: ${error}`
      };
    }
  }

  /**
   * Execute a conditional step
   */
  private async executeConditionalStep(step: any, executionData: any): Promise<any> {
    try {
      const { condition, trueStep, falseStep } = step.config;
      
      // Process template variables in condition
      const resolvedCondition = this.processTemplate(condition, executionData);
      
      // Create a function from the condition
      const conditionFn = new Function('context', `return ${resolvedCondition};`);
      
      // Execute the condition with the context
      const conditionResult = conditionFn({
        executionData,
        outputs: executionData.outputs
      });
      
      console.log(`Condition result: ${conditionResult}`);
      
      // Execute the appropriate step based on the condition
      if (conditionResult) {
        // Execute true step if condition is true
        if (trueStep) {
          return await this.executeWorkflowStep(trueStep, executionData, null);
        } else {
          return {
            success: true,
            message: 'Condition evaluated to true, but no true step defined'
          };
        }
      } else {
        // Execute false step if condition is false
        if (falseStep) {
          return await this.executeWorkflowStep(falseStep, executionData, null);
        } else {
          return {
            success: true,
            message: 'Condition evaluated to false, but no false step defined'
          };
        }
      }
    } catch (error) {
      console.error('Error executing conditional step:', error);
      return {
        success: false,
        error: `Conditional step error: ${error}`
      };
    }
  }

  /**
   * Execute a file import step
   */
  private async executeFileImportStep(step: any, executionData: any): Promise<any> {
    try {
      const { sourcePath, fileCategory, fileSource } = step.config;
      
      // Process template variables in paths
      const resolvedSourcePath = this.processTemplate(sourcePath, executionData);
      const resolvedFileCategory = this.processTemplate(fileCategory || 'other', executionData);
      const resolvedFileSource = this.processTemplate(fileSource || 'local', executionData);
      
      console.log(`File import: ${resolvedSourcePath}, category: ${resolvedFileCategory}, source: ${resolvedFileSource}`);
      
      // Check if file exists
      if (!fs.existsSync(resolvedSourcePath)) {
        return {
          success: false,
          error: `File does not exist: ${resolvedSourcePath}`
        };
      }
      
      // Get file stats
      const stats = fs.statSync(resolvedSourcePath);
      
      // Skip directories
      if (stats.isDirectory()) {
        return {
          success: false,
          error: `Path is a directory, not a file: ${resolvedSourcePath}`
        };
      }
      
      // Parse file info
      const fileName = path.basename(resolvedSourcePath);
      const fileType = path.extname(resolvedSourcePath).substring(1); // Remove the leading dot
      
      // Create file record
      const fileData = {
        name: fileName,
        path: resolvedSourcePath,
        fileType,
        fileCategory: resolvedFileCategory,
        fileSize: stats.size,
        lastModified: stats.mtime,
        source: resolvedFileSource,
        userId: executionData.context.userId,
        isProcessed: true
      };
      
      // Create the file in the database
      const file = await storage.createFile(fileData);
      
      return {
        success: true,
        message: `File imported: ${resolvedSourcePath}`,
        output: file
      };
    } catch (error) {
      console.error('Error executing file import step:', error);
      return {
        success: false,
        error: `File import error: ${error}`
      };
    }
  }

  /**
   * Execute a file export step
   */
  private async executeFileExportStep(step: any, executionData: any): Promise<any> {
    try {
      const { fileId, targetPath, overwrite } = step.config;
      
      // Process template variables
      const resolvedFileId = parseInt(this.processTemplate(fileId, executionData));
      const resolvedTargetPath = this.processTemplate(targetPath, executionData);
      const shouldOverwrite = overwrite === true || overwrite === 'true';
      
      console.log(`File export: file ID ${resolvedFileId} to ${resolvedTargetPath}, overwrite: ${shouldOverwrite}`);
      
      // Get the file from the database
      const file = await this.getFileById(resolvedFileId);
      
      if (!file) {
        return {
          success: false,
          error: `File not found with ID: ${resolvedFileId}`
        };
      }
      
      // Check if target file already exists
      if (fs.existsSync(resolvedTargetPath) && !shouldOverwrite) {
        return {
          success: false,
          error: `Target file already exists and overwrite is disabled: ${resolvedTargetPath}`
        };
      }
      
      // If the file has a physical path, copy it
      if (file.path && fs.existsSync(file.path)) {
        // Ensure target directory exists
        const targetDir = path.dirname(resolvedTargetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copy the file
        fs.copyFileSync(file.path, resolvedTargetPath);
        
        return {
          success: true,
          message: `File exported to ${resolvedTargetPath}`,
          output: resolvedTargetPath
        };
      } else {
        // No physical file to copy
        return {
          success: false,
          error: `File has no physical path or file does not exist: ${file.path}`
        };
      }
    } catch (error) {
      console.error('Error executing file export step:', error);
      return {
        success: false,
        error: `File export error: ${error}`
      };
    }
  }

  /**
   * Execute a data transform step
   */
  private async executeDataTransformStep(step: any, executionData: any): Promise<any> {
    try {
      const { transformType, inputData, transformConfig } = step.config;
      
      // Process template variables
      const resolvedInputData = inputData ? JSON.parse(this.processTemplate(JSON.stringify(inputData), executionData)) : null;
      const resolvedTransformConfig = transformConfig ? JSON.parse(this.processTemplate(JSON.stringify(transformConfig), executionData)) : {};
      
      console.log(`Data transform: ${transformType}`);
      
      // Get input data from previous step if not explicitly provided
      const data = resolvedInputData || (step.inputFrom ? executionData.outputs[step.inputFrom] : null);
      
      if (!data) {
        return {
          success: false,
          error: 'No input data provided for transformation'
        };
      }
      
      // Execute the transform based on type
      let result;
      switch (transformType) {
        case 'json_to_csv':
          result = this.transformJsonToCsv(data, resolvedTransformConfig);
          break;
          
        case 'csv_to_json':
          result = this.transformCsvToJson(data, resolvedTransformConfig);
          break;
          
        case 'json_filter':
          result = this.transformJsonFilter(data, resolvedTransformConfig);
          break;
          
        case 'json_map':
          result = this.transformJsonMap(data, resolvedTransformConfig);
          break;
          
        case 'text_extract':
          result = this.transformTextExtract(data, resolvedTransformConfig);
          break;
          
        default:
          return {
            success: false,
            error: `Unknown transform type: ${transformType}`
          };
      }
      
      return {
        success: true,
        message: `Data transformed successfully using ${transformType}`,
        output: result
      };
    } catch (error) {
      console.error('Error executing data transform step:', error);
      return {
        success: false,
        error: `Data transform error: ${error}`
      };
    }
  }

  /**
   * Execute an AI analysis step
   */
  private async executeAiAnalysisStep(step: any, executionData: any): Promise<any> {
    try {
      const { provider, analysisType, inputData, prompt, modelConfig } = step.config;
      
      // Process template variables
      const resolvedInputData = inputData ? this.processTemplate(inputData, executionData) : null;
      const resolvedPrompt = prompt ? this.processTemplate(prompt, executionData) : null;
      const resolvedModelConfig = modelConfig ? JSON.parse(this.processTemplate(JSON.stringify(modelConfig), executionData)) : {};
      
      console.log(`AI analysis: provider=${provider}, type=${analysisType}`);
      
      // Get input data from previous step if not explicitly provided
      const data = resolvedInputData || (step.inputFrom ? executionData.outputs[step.inputFrom] : null);
      
      if (!data && analysisType !== 'text_generation') {
        return {
          success: false,
          error: 'No input data provided for AI analysis'
        };
      }
      
      // Check if AI provider is available
      if (provider === 'openai' && !openai) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.'
        };
      } else if (provider === 'huggingface' && !hf) {
        return {
          success: false,
          error: 'Hugging Face API key not configured. Please set the HUGGINGFACE_API_KEY environment variable.'
        };
      }
      
      // Execute the analysis based on type and provider
      let result;
      switch (provider) {
        case 'openai':
          result = await this.performOpenAIAnalysis(analysisType, data, resolvedPrompt, resolvedModelConfig);
          break;
          
        case 'huggingface':
          result = await this.performHuggingFaceAnalysis(analysisType, data, resolvedPrompt, resolvedModelConfig);
          break;
          
        default:
          return {
            success: false,
            error: `Unknown AI provider: ${provider}`
          };
      }
      
      return {
        success: true,
        message: `AI analysis completed successfully using ${provider}`,
        output: result
      };
    } catch (error) {
      console.error('Error executing AI analysis step:', error);
      return {
        success: false,
        error: `AI analysis error: ${error}`
      };
    }
  }

  /**
   * Execute a database operation step
   */
  private async executeDatabaseOperationStep(step: any, executionData: any): Promise<any> {
    try {
      const { operation, modelType, data, query, options } = step.config;
      
      // Process template variables
      const resolvedModelType = this.processTemplate(modelType, executionData);
      const resolvedData = data ? JSON.parse(this.processTemplate(JSON.stringify(data), executionData)) : null;
      const resolvedQuery = query ? JSON.parse(this.processTemplate(JSON.stringify(query), executionData)) : null;
      const resolvedOptions = options ? JSON.parse(this.processTemplate(JSON.stringify(options), executionData)) : {};
      
      console.log(`Database operation: ${operation} on ${resolvedModelType}`);
      
      // Execute the database operation based on type
      let result;
      switch (operation) {
        case 'create':
          result = await this.executeDatabaseCreate(resolvedModelType, resolvedData, executionData);
          break;
          
        case 'read':
          result = await this.executeDatabaseRead(resolvedModelType, resolvedQuery, resolvedOptions, executionData);
          break;
          
        case 'update':
          result = await this.executeDatabaseUpdate(resolvedModelType, resolvedQuery, resolvedData, executionData);
          break;
          
        case 'delete':
          result = await this.executeDatabaseDelete(resolvedModelType, resolvedQuery, executionData);
          break;
          
        default:
          return {
            success: false,
            error: `Unknown database operation: ${operation}`
          };
      }
      
      return {
        success: true,
        message: `Database ${operation} operation completed successfully`,
        output: result
      };
    } catch (error) {
      console.error('Error executing database operation step:', error);
      return {
        success: false,
        error: `Database operation error: ${error}`
      };
    }
  }

  /**
   * Execute a notification step
   */
  private async executeNotificationStep(step: any, executionData: any): Promise<any> {
    try {
      const { notificationType, title, message, target } = step.config;
      
      // Process template variables
      const resolvedTitle = this.processTemplate(title, executionData);
      const resolvedMessage = this.processTemplate(message, executionData);
      const resolvedTarget = target ? this.processTemplate(target, executionData) : null;
      
      console.log(`Notification: ${notificationType}, title: ${resolvedTitle}`);
      
      // Execute the notification based on type
      switch (notificationType) {
        case 'system':
          // Create a system notification
          await storage.createNotification({
            userId: executionData.context.userId,
            title: resolvedTitle,
            message: resolvedMessage,
            type: 'system',

            createdAt: new Date()
          });
          
          return {
            success: true,
            message: 'System notification created',
            output: {
              title: resolvedTitle,
              message: resolvedMessage
            }
          };
          
        case 'email':
          // Email notifications would be handled here if implemented
          return {
            success: false,
            error: 'Email notifications are not implemented yet'
          };
          
        case 'webhook':
          // Send webhook notification
          if (!resolvedTarget) {
            return {
              success: false,
              error: 'Target URL is required for webhook notifications'
            };
          }
          
          const webhookResponse = await fetch(resolvedTarget, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: resolvedTitle,
              message: resolvedMessage,
              timestamp: new Date().toISOString(),
              source: 'PinkyAI_OS'
            })
          });
          
          if (!webhookResponse.ok) {
            return {
              success: false,
              error: `Webhook notification failed with status ${webhookResponse.status}: ${webhookResponse.statusText}`
            };
          }
          
          return {
            success: true,
            message: 'Webhook notification sent',
            output: {
              title: resolvedTitle,
              message: resolvedMessage,
              statusCode: webhookResponse.status
            }
          };
          
        default:
          return {
            success: false,
            error: `Unknown notification type: ${notificationType}`
          };
      }
    } catch (error) {
      console.error('Error executing notification step:', error);
      return {
        success: false,
        error: `Notification error: ${error}`
      };
    }
  }

  /**
   * Match a file path against a glob pattern
   */
  private async matchGlobPattern(filePath: string, pattern: string): Promise<boolean> {
    try {
      const matches = await glob(pattern);
      return matches.includes(filePath);
    } catch (error) {
      console.error(`Error matching glob pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Get a file by ID
   */
  private async getFileById(fileId: number): Promise<any> {
    try {
      // Get the file from the database
      const file = await storage.getFile(fileId);
      return file;
    } catch (error) {
      console.error(`Error getting file with ID ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Process a template string by replacing variables with values from execution data
   */
  private processTemplate(template: string, executionData: any): string {
    if (!template || typeof template !== 'string') {
      return template;
    }
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const path = variable.trim().split('.');
      let value = executionData;
      
      // Traverse the path to get the value
      for (const key of path) {
        if (value === undefined || value === null) {
          return match; // Keep the original placeholder if path doesn't exist
        }
        value = value[key];
      }
      
      // Convert objects to JSON strings
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Transform JSON to CSV
   */
  private transformJsonToCsv(data: any, config: any): string {
    // If data is a string, try to parse it as JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (unlinkError) {
        throw new Error('Input data is not valid JSON');
      }
    }
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      throw new Error('Input data must be an array of objects');
    }
    
    if (data.length === 0) {
      return '';
    }
    
    // Get headers from the data or config
    const headers = config.headers || Object.keys(data[0]);
    
    // Generate CSV
    const rows = [headers];
    
    for (const item of data) {
      const row = headers.map(header => {
        const value = item[header];
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return JSON.stringify(value);
        } else {
          return String(value);
        }
      });
      
      rows.push(row);
    }
    
    // Convert to CSV string
    return rows.map(row => row.map(cell => {
      // Escape quotes and wrap in quotes if needed
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')).join('\n');
  }

  /**
   * Transform CSV to JSON
   */
  private transformCsvToJson(data: string, config: any): any[] {
    // Ensure data is a string
    if (typeof data !== 'string') {
      try {
        data = String(data);
      } catch (parseError) {
        throw new Error('Input data cannot be converted to a string');
      }
    }
    
    // Split into rows
    const rows = data.split(/\r?\n/);
    
    if (rows.length === 0) {
      return [];
    }
    
    // Parse headers
    const headers = config.headers || this.parseCsvRow(rows[0]);
    
    // Parse rows
    const result = [];
    
    for (let i = config.headers ? 0 : 1; i < rows.length; i++) {
      if (rows[i].trim() === '') {
        continue;
      }
      
      const values = this.parseCsvRow(rows[i]);
      
      if (values.length !== headers.length) {
        console.error(`Row ${i} has ${values.length} values, expected ${headers.length}`);
        continue;
      }
      
      const obj = {};
      
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }
      
      result.push(obj);
    }
    
    return result;
  }

  /**
   * Parse a CSV row into an array of values
   */
  private parseCsvRow(row: string): string[] {
    const values = [];
    let insideQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (insideQuotes && i + 1 < row.length && row[i + 1] === '"') {
          // Escaped quote
          currentValue += '"';
          i++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of value
        values.push(currentValue);
        currentValue = '';
      } else {
        // Add to current value
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    return values;
  }

  /**
   * Filter JSON data
   */
  private transformJsonFilter(data: any, config: any): any[] {
    // If data is a string, try to parse it as JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        throw new Error('Input data is not valid JSON');
      }
    }
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      throw new Error('Input data must be an array of objects');
    }
    
    // Create a filter function based on the config
    const filterFn = new Function('item', `return ${config.condition};`);
    
    // Apply the filter
    return data.filter(item => {
      try {
        return filterFn(item);
      } catch (error) {
        console.error('Error evaluating filter condition:', error);
        return false;
      }
    });
  }

  /**
   * Map JSON data
   */
  private transformJsonMap(data: any, config: any): any[] {
    // If data is a string, try to parse it as JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        throw new Error('Input data is not valid JSON');
      }
    }
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      throw new Error('Input data must be an array of objects');
    }
    
    // If no mapping is provided, return the original data
    if (!config.mapping) {
      return data;
    }
    
    // Apply the mapping to each item
    return data.map(item => {
      const result = {};
      
      for (const [targetKey, sourcePath] of Object.entries(config.mapping)) {
        const path = String(sourcePath).split('.');
        let value = item;
        
        // Traverse the path to get the value
        for (const key of path) {
          if (value === undefined || value === null) {
            value = undefined;
            break;
          }
          value = value[key];
        }
        
        result[targetKey] = value;
      }
      
      return result;
    });
  }

  /**
   * Extract text using regex or other methods
   */
  private transformTextExtract(data: string, config: any): any {
    // Ensure data is a string
    if (typeof data !== 'string') {
      try {
        data = String(data);
      } catch (error) {
        throw new Error('Input data cannot be converted to a string');
      }
    }
    
    // Extract using regex
    if (config.regex) {
      const regex = new RegExp(config.regex, config.regexFlags || 'g');
      const matches = [];
      let match;
      
      while ((match = regex.exec(data)) !== null) {
        matches.push(match[0]);
      }
      
      return matches;
    }
    
    // Extract using start and end strings
    if (config.startsWith && config.endsWith) {
      const startIdx = data.indexOf(config.startsWith);
      
      if (startIdx === -1) {
        return [];
      }
      
      const startPos = startIdx + config.startsWith.length;
      const endIdx = data.indexOf(config.endsWith, startPos);
      
      if (endIdx === -1) {
        return [];
      }
      
      return [data.substring(startPos, endIdx)];
    }
    
    // No extraction method specified
    throw new Error('No extraction method specified (regex or startsWith/endsWith)');
  }

  /**
   * Perform analysis using OpenAI API
   */
  private async performOpenAIAnalysis(
    analysisType: string,
    data: any,
    prompt: string,
    config: any
  ): Promise<any> {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }
    
    const model = config.model || 'gpt-4o';
    
    switch (analysisType) {
      case 'text_generation':
        const completionResponse = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt || 'You are a helpful AI assistant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 300
        });
        
        return completionResponse.choices[0].message.content;
        
      case 'text_classification':
        const classificationResponse = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt || `Classify the following text into one of these categories: ${config.categories.join(', ')}`
            },
            {
              role: 'user',
              content: data
            }
          ],
          temperature: 0.3,
          max_tokens: 50
        });
        
        return classificationResponse.choices[0].message.content.trim();
        
      case 'summarization':
        const summarizationResponse = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt || 'Summarize the following text concisely.'
            },
            {
              role: 'user',
              content: data
            }
          ],
          temperature: 0.5,
          max_tokens: config.maxTokens || 150
        });
        
        return summarizationResponse.choices[0].message.content;
        
      case 'structured_extraction':
        const extractionResponse = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt || `Extract structured information from the following text in JSON format with these fields: ${Object.keys(config.fields).join(', ')}`
            },
            {
              role: 'user',
              content: data
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: config.maxTokens || 500
        });
        
        return JSON.parse(extractionResponse.choices[0].message.content);
        
      default:
        throw new Error(`Unknown OpenAI analysis type: ${analysisType}`);
    }
  }

  /**
   * Perform analysis using Hugging Face API
   */
  private async performHuggingFaceAnalysis(
    analysisType: string,
    data: any,
    prompt: string,
    config: any
  ): Promise<any> {
    if (!hf) {
      throw new Error('Hugging Face API key not configured');
    }
    
    const model = config.model || 'gpt2';
    
    switch (analysisType) {
      case 'text_generation':
        const textGeneration = await hf.textGeneration({
          model: model,
          inputs: prompt,
          parameters: {
            max_new_tokens: config.maxTokens || 100,
            temperature: config.temperature || 0.7
          }
        });
        
        return textGeneration.generated_text;
        
      case 'summarization':
        const summarization = await hf.summarization({
          model: config.model || 'facebook/bart-large-cnn',
          inputs: data,
          parameters: {
            max_length: config.maxTokens || 130,
            min_length: config.minTokens || 30
          }
        });
        
        return summarization.summary_text;
        
      case 'text_classification':
        const classification = await hf.textClassification({
          model: config.model || 'distilbert-base-uncased-finetuned-sst-2-english',
          inputs: data
        });
        
        return classification;
        
      default:
        throw new Error(`Unknown Hugging Face analysis type: ${analysisType}`);
    }
  }

  /**
   * Execute database create operation
   */
  private async executeDatabaseCreate(modelType: string, data: any, executionData: any): Promise<any> {
    switch (modelType) {
      case 'file':
        return await storage.createFile({
          ...data,
          userId: executionData.context.userId
        });
        
      case 'recommendation':
        return await storage.createRecommendation({
          ...data,
          userId: executionData.context.userId
        });
        
      case 'notification':
        return await storage.createNotification({
          ...data,
          userId: executionData.context.userId
        });
        
      default:
        throw new Error(`Unknown model type for database create: ${modelType}`);
    }
  }

  /**
   * Execute database read operation
   */
  private async executeDatabaseRead(modelType: string, query: any, options: any, executionData: any): Promise<any> {
    const userId = executionData.context.userId;
    
    switch (modelType) {
      case 'file':
        if (query.id) {
          return await storage.getFile(query.id);
        } else if (query.category) {
          return await storage.getFilesByCategory(userId, query.category);
        } else if (query.source) {
          return await storage.getFilesBySource(userId, query.source);
        } else {
          return await storage.getFiles(userId);
        }
        
      case 'recommendation':
        if (query.id) {
          return await storage.getRecommendation(query.id);
        } else if (query.active) {
          return await storage.getActiveRecommendations(userId);
        } else {
          return await storage.getRecommendations(userId);
        }
        
      default:
        throw new Error(`Unknown model type for database read: ${modelType}`);
    }
  }

  /**
   * Execute database update operation
   */
  private async executeDatabaseUpdate(modelType: string, query: any, data: any, executionData: any): Promise<any> {
    if (!query.id) {
      throw new Error('ID is required for database update operations');
    }
    
    switch (modelType) {
      case 'file':
        return await storage.updateFile(query.id, data);
        
      case 'recommendation':
        return await storage.updateRecommendation(query.id, data);
        
      default:
        throw new Error(`Unknown model type for database update: ${modelType}`);
    }
  }

  /**
   * Execute database delete operation
   */
  private async executeDatabaseDelete(modelType: string, query: any, executionData: any): Promise<any> {
    if (!query.id) {
      throw new Error('ID is required for database delete operations');
    }
    
    switch (modelType) {
      case 'file':
        return await storage.deleteFile(query.id);
        
      case 'recommendation':
        return await storage.deleteRecommendation(query.id);
        
      default:
        throw new Error(`Unknown model type for database delete: ${modelType}`);
    }
  }
}

export const automationService = new AutomationService();