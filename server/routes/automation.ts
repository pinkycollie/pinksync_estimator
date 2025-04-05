import express from 'express';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  insertFileWatchConfigSchema, 
  insertAutomationWorkflowSchema,
  FileEventType,
  TriggerType,
  WorkflowStepType,
  ScheduleConfig
} from '@shared/schema';
import { storage } from '../storage';
import { fileMonitoringService, automationService } from '../utils';

const router = Router();

// File Watch API endpoints
router.get('/file-watchers', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all file watchers for the user
    const fileWatchers = await storage.getFileWatchConfigs(user.id);
    
    // Get active watchers from the monitoring service
    const activeMonitoringWatchers = await fileMonitoringService.getActiveWatchers();
    const activeWatcherIds = activeMonitoringWatchers.map(watcher => watcher.id);
    
    // Enhance response with real-time status
    const enhancedWatchers = fileWatchers.map(watcher => ({
      ...watcher,
      isRunning: activeWatcherIds.includes(watcher.id)
    }));
    
    res.json(enhancedWatchers);
  } catch (error) {
    console.error("Error getting file watchers:", error);
    res.status(500).json({ message: "Failed to get file watchers", error });
  }
});

// Get active file watchers
router.get('/file-watchers/active', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get active watchers from the database
    const dbActiveWatchers = await storage.getActiveFileWatchConfigs(user.id);
    
    // Get active watchers from the monitoring service
    const activeMonitoringWatchers = await fileMonitoringService.getActiveWatchers();
    const activeWatcherIds = activeMonitoringWatchers.map(watcher => watcher.id);
    
    // Enhance response with real-time status
    const enhancedWatchers = dbActiveWatchers.map(watcher => ({
      ...watcher,
      isRunning: activeWatcherIds.includes(watcher.id)
    }));
    
    res.json(enhancedWatchers);
  } catch (error) {
    console.error("Error getting active file watchers:", error);
    res.status(500).json({ message: "Failed to get active file watchers", error });
  }
});

// Get a specific file watcher by ID
router.get('/file-watchers/:id', async (req: Request, res: Response) => {
  try {
    const watcherId = parseInt(req.params.id);
    
    // Get the watcher from the database
    const watcher = await storage.getFileWatchConfig(watcherId);
    
    if (!watcher) {
      return res.status(404).json({ message: "File watcher not found" });
    }
    
    // Get active watchers from the monitoring service
    const activeMonitoringWatchers = await fileMonitoringService.getActiveWatchers();
    const activeWatcherIds = activeMonitoringWatchers.map(watcher => watcher.id);
    
    // Enhance response with real-time status
    const enhancedWatcher = {
      ...watcher,
      isRunning: activeWatcherIds.includes(watcher.id)
    };
    
    res.json(enhancedWatcher);
  } catch (error) {
    console.error(`Error getting file watcher ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to get file watcher ${req.params.id}`, error });
  }
});

// Create a new file watcher
router.post('/file-watchers', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Parse and validate input
    const watcherData = insertFileWatchConfigSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    // Create the watcher in the database
    const watcher = await storage.createFileWatchConfig(watcherData);
    
    // Start the watcher if it's marked as active
    if (watcher.isActive) {
      await fileMonitoringService.startWatching(watcher);
    }
    
    res.status(201).json(watcher);
  } catch (error) {
    console.error("Error creating file watcher:", error);
    res.status(400).json({ message: "Failed to create file watcher", error });
  }
});

// Update a file watcher
router.patch('/file-watchers/:id', async (req: Request, res: Response) => {
  try {
    const watcherId = parseInt(req.params.id);
    
    // Get the existing watcher
    const existingWatcher = await storage.getFileWatchConfig(watcherId);
    
    if (!existingWatcher) {
      return res.status(404).json({ message: "File watcher not found" });
    }
    
    // Update the watcher in the database
    const updatedWatcher = await storage.updateFileWatchConfig(watcherId, req.body);
    
    if (!updatedWatcher) {
      return res.status(500).json({ message: "Failed to update file watcher" });
    }
    
    // If the watcher was updated to be active, start it
    if (updatedWatcher.isActive) {
      await fileMonitoringService.startWatching(updatedWatcher);
    } else {
      // If the watcher was updated to be inactive, stop it
      await fileMonitoringService.stopWatching(watcherId);
    }
    
    res.json(updatedWatcher);
  } catch (error) {
    console.error(`Error updating file watcher ${req.params.id}:`, error);
    res.status(400).json({ message: `Failed to update file watcher ${req.params.id}`, error });
  }
});

// Delete a file watcher
router.delete('/file-watchers/:id', async (req: Request, res: Response) => {
  try {
    const watcherId = parseInt(req.params.id);
    
    // Get the existing watcher
    const existingWatcher = await storage.getFileWatchConfig(watcherId);
    
    if (!existingWatcher) {
      return res.status(404).json({ message: "File watcher not found" });
    }
    
    // Stop the watcher if it's running
    await fileMonitoringService.stopWatching(watcherId);
    
    // Delete the watcher from the database
    const deleted = await storage.deleteFileWatchConfig(watcherId);
    
    if (!deleted) {
      return res.status(500).json({ message: "Failed to delete file watcher" });
    }
    
    res.json({ message: "File watcher deleted successfully" });
  } catch (error) {
    console.error(`Error deleting file watcher ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to delete file watcher ${req.params.id}`, error });
  }
});

// Start a file watcher
router.post('/file-watchers/:id/start', async (req: Request, res: Response) => {
  try {
    const watcherId = parseInt(req.params.id);
    
    // Get the existing watcher
    const existingWatcher = await storage.getFileWatchConfig(watcherId);
    
    if (!existingWatcher) {
      return res.status(404).json({ message: "File watcher not found" });
    }
    
    // Set the watcher to active
    const updatedWatcher = await storage.updateFileWatchConfig(watcherId, { 
      isActive: true,
      lastRunAt: new Date() 
    });
    
    if (!updatedWatcher) {
      return res.status(500).json({ message: "Failed to update file watcher" });
    }
    
    // Start the watcher
    const started = await fileMonitoringService.startWatching(updatedWatcher);
    
    if (!started) {
      return res.status(500).json({ message: "Failed to start file watcher" });
    }
    
    res.json({ message: "File watcher started successfully", watcher: updatedWatcher });
  } catch (error) {
    console.error(`Error starting file watcher ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to start file watcher ${req.params.id}`, error });
  }
});

// Stop a file watcher
router.post('/file-watchers/:id/stop', async (req: Request, res: Response) => {
  try {
    const watcherId = parseInt(req.params.id);
    
    // Get the existing watcher
    const existingWatcher = await storage.getFileWatchConfig(watcherId);
    
    if (!existingWatcher) {
      return res.status(404).json({ message: "File watcher not found" });
    }
    
    // Set the watcher to inactive
    const updatedWatcher = await storage.updateFileWatchConfig(watcherId, { 
      isActive: false,
      lastRunAt: new Date() 
    });
    
    if (!updatedWatcher) {
      return res.status(500).json({ message: "Failed to update file watcher" });
    }
    
    // Stop the watcher
    const stopped = await fileMonitoringService.stopWatching(watcherId);
    
    if (!stopped) {
      return res.status(500).json({ message: "Failed to stop file watcher" });
    }
    
    res.json({ message: "File watcher stopped successfully", watcher: updatedWatcher });
  } catch (error) {
    console.error(`Error stopping file watcher ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to stop file watcher ${req.params.id}`, error });
  }
});

// Automation Workflow API endpoints
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all workflows for the user
    const workflows = await storage.getAutomationWorkflows(user.id);
    res.json(workflows);
  } catch (error) {
    console.error("Error getting automation workflows:", error);
    res.status(500).json({ message: "Failed to get automation workflows", error });
  }
});

// Get active workflows
router.get('/workflows/active', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get active workflows from the database
    const activeWorkflows = await storage.getActiveAutomationWorkflows(user.id);
    
    res.json(activeWorkflows);
  } catch (error) {
    console.error("Error getting active automation workflows:", error);
    res.status(500).json({ message: "Failed to get active automation workflows", error });
  }
});

// Get workflows by trigger type
router.get('/workflows/by-trigger/:triggerType', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { triggerType } = req.params;
    
    // Verify it's a valid trigger type
    if (!Object.values(TriggerType).includes(triggerType as TriggerType)) {
      return res.status(400).json({ message: "Invalid trigger type" });
    }
    
    // Get workflows by trigger type
    const workflows = await storage.getAutomationWorkflowsByTriggerType(user.id, triggerType);
    
    res.json(workflows);
  } catch (error) {
    console.error(`Error getting workflows by trigger type ${req.params.triggerType}:`, error);
    res.status(500).json({ message: `Failed to get workflows by trigger type ${req.params.triggerType}`, error });
  }
});

// Get a specific workflow by ID
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const workflowId = parseInt(req.params.id);
    
    // Get the workflow from the database
    const workflow = await storage.getAutomationWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({ message: "Automation workflow not found" });
    }
    
    res.json(workflow);
  } catch (error) {
    console.error(`Error getting automation workflow ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to get automation workflow ${req.params.id}`, error });
  }
});

// Create a new workflow
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Parse and validate input
    const workflowData = insertAutomationWorkflowSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    // Create the workflow in the database
    const workflow = await storage.createAutomationWorkflow(workflowData);
    
    // If it's a scheduled workflow and active, schedule it
    if (workflow.triggerType === TriggerType.SCHEDULE && workflow.isActive) {
      await automationService.scheduleWorkflow(workflow);
    }
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error("Error creating automation workflow:", error);
    res.status(400).json({ message: "Failed to create automation workflow", error });
  }
});

// Update a workflow
router.patch('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const workflowId = parseInt(req.params.id);
    
    // Get the existing workflow
    const existingWorkflow = await storage.getAutomationWorkflow(workflowId);
    
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Automation workflow not found" });
    }
    
    // Update the workflow in the database
    const updatedWorkflow = await storage.updateAutomationWorkflow(workflowId, req.body);
    
    if (!updatedWorkflow) {
      return res.status(500).json({ message: "Failed to update automation workflow" });
    }
    
    // If it's a scheduled workflow, update the schedule
    if (updatedWorkflow.triggerType === TriggerType.SCHEDULE) {
      if (updatedWorkflow.isActive) {
        // Schedule or reschedule if active
        await automationService.scheduleWorkflow(updatedWorkflow);
      } else {
        // Cancel schedule if inactive
        automationService.cancelSchedule(workflowId);
      }
    }
    
    res.json(updatedWorkflow);
  } catch (error) {
    console.error(`Error updating automation workflow ${req.params.id}:`, error);
    res.status(400).json({ message: `Failed to update automation workflow ${req.params.id}`, error });
  }
});

// Delete a workflow
router.delete('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const workflowId = parseInt(req.params.id);
    
    // Get the existing workflow
    const existingWorkflow = await storage.getAutomationWorkflow(workflowId);
    
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Automation workflow not found" });
    }
    
    // If it's a scheduled workflow, cancel the schedule
    if (existingWorkflow.triggerType === TriggerType.SCHEDULE) {
      automationService.cancelSchedule(workflowId);
    }
    
    // Delete the workflow from the database
    const deleted = await storage.deleteAutomationWorkflow(workflowId);
    
    if (!deleted) {
      return res.status(500).json({ message: "Failed to delete automation workflow" });
    }
    
    res.json({ message: "Automation workflow deleted successfully" });
  } catch (error) {
    console.error(`Error deleting automation workflow ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to delete automation workflow ${req.params.id}`, error });
  }
});

// Manually execute a workflow
router.post('/workflows/:id/execute', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const workflowId = parseInt(req.params.id);
    
    // Get the workflow
    const workflow = await storage.getAutomationWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({ message: "Automation workflow not found" });
    }
    
    // Execute the workflow
    const result = await automationService.executeWorkflow(workflowId, {
      source: 'manual',
      timestamp: new Date(),
      userId: user.id,
      data: req.body.data || {}
    });
    
    res.json(result);
  } catch (error) {
    console.error(`Error executing automation workflow ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to execute automation workflow ${req.params.id}`, error });
  }
});

// Get all executions for a workflow
router.get('/workflows/:id/executions', async (req: Request, res: Response) => {
  try {
    const workflowId = parseInt(req.params.id);
    
    // Get the workflow
    const workflow = await storage.getAutomationWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({ message: "Automation workflow not found" });
    }
    
    // Get all executions for the workflow
    const executions = await storage.getWorkflowExecutions(workflowId);
    
    res.json(executions);
  } catch (error) {
    console.error(`Error getting executions for workflow ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to get executions for workflow ${req.params.id}`, error });
  }
});

// Get recent executions for all workflows for a user
router.get('/executions/recent', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    // Get recent executions for the user
    const executions = await storage.getRecentWorkflowExecutions(user.id, limit);
    
    res.json(executions);
  } catch (error) {
    console.error("Error getting recent workflow executions:", error);
    res.status(500).json({ message: "Failed to get recent workflow executions", error });
  }
});

// Get a specific execution by ID
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const executionId = parseInt(req.params.id);
    
    // Get the execution
    const execution = await storage.getWorkflowExecution(executionId);
    
    if (!execution) {
      return res.status(404).json({ message: "Workflow execution not found" });
    }
    
    // Get the associated workflow
    const workflow = await storage.getAutomationWorkflow(execution.workflowId);
    
    res.json({
      execution,
      workflow: workflow ? {
        id: workflow.id,
        name: workflow.name,
        triggerType: workflow.triggerType
      } : null
    });
  } catch (error) {
    console.error(`Error getting workflow execution ${req.params.id}:`, error);
    res.status(500).json({ message: `Failed to get workflow execution ${req.params.id}`, error });
  }
});

export default router;