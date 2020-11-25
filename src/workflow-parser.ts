import * as YAML from 'yaml'

interface Job {
  steps: string[]
}

interface Workflow {
  name?: string
  on?: string[]
  jobs?: Job[]
}

export class WorkflowParser {
  _rawWorkflow: string
  _workflow: Workflow

  constructor (rawWorkflow: string) {
    this._rawWorkflow = rawWorkflow
    this._workflow = this.getYAMLWorkflow()
  }

  getYAMLWorkflow (): Workflow {
    return YAML.parse(this._rawWorkflow)
  };

  getWorkflowName (): string | undefined {
    return this._workflow.name
  };

  getTriggers (): string[] | undefined {
    return this._workflow.on
  };

  getNumJobs (): number {
    const jobs = this._workflow.jobs ?? {}

    return Object.keys(jobs).length
  };

  getNumSteps (): number {
    let steps = 0
    for (const i in this._workflow.jobs) {
      steps += Number(this._workflow.jobs[i].steps.length)
    }
    return steps
  };

  // goal: {'action1': 3, 'action2': 4}
  getActionCountsPerFile (): Object {
    const actionsWithCount = {}

    // TODO do better than a triple loop
    for (const i in this._workflow.jobs) {
      for (const j in this._workflow.jobs[i].steps) {
        for (const k in this._workflow.jobs[i].steps[j]) {
          // ok, it's calling an action
          if (k === 'uses') {
            const actionName = this._workflow.jobs[i].steps[j][k]

            if (typeof actionsWithCount[actionName] === 'number') {
              actionsWithCount[actionName]++
            } else if (typeof actionsWithCount[actionName] === 'undefined') {
              actionsWithCount[actionName] = 1
            }
          }
        }
      }
    }

    return actionsWithCount
  };
}
