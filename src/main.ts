import * as core from '@actions/core'
import * as github from '@actions/github'
import * as artifact from '@actions/artifact'
import * as fs from 'fs'
import { WorkflowParser } from './workflow-parser'
import { File, RepoWithOwner, Reports, Workflow, WorkflowData } from '../interfaces/types'

const octokit = github.getOctokit(process.env.GITHUB_TOKEN ?? '')

// Return raw text of file contents, or empty string
const getRawFileContents = async (file: File, params: RepoWithOwner): Promise<any> => {
  core.debug(`getRawFileContents. params: ${params.owner}, ${params.repo}, file: ${file.path}`)

  if (file.type === 'file') {
    const { data: contents } = await octokit.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: file.path,
      mediaType: {
        format: 'raw'
      }
    })

    core.debug(`getRawFileContents. contents: ${JSON.stringify(contents)}`)

    return contents
  }
}

const readWorkflowPath = async (owner: string, repo: string, path: string): Promise<Workflow[]> => {
  try {
    const { data: workflows } = await octokit.repos.getContent({
      owner,
      repo,
      path
    })
    return workflows as unknown as Workflow[]
  } catch (error) {
    core.debug(`No workflows found for owner ${owner}, repo ${repo}`)
  }
  return []
}

// Return array of objects of workflow ymls, or empty array
const getWorkflows = async (reposWithOwner: string): Promise<Workflow[]> => {
  core.debug(`getWorkflows. reposWithOwner: ${reposWithOwner}`)

  const [owner, repo] = reposWithOwner.split('/')
  const path = '.github/workflows'

  const workflows = await readWorkflowPath(owner, repo, path)

  core.debug(`getWorkflows. workflows: ${JSON.stringify(workflows)}`)

  // Get contents of each workflow in workflows directory
  const rawWorkflows: Workflow[] = await Promise.all((workflows as any).map(async (workflow: any) => {
    core.debug(`getWorkflows. workflow: ${workflow}`)

    return {
      meta: workflow.html_url,
      raw: await getRawFileContents(workflow, { owner, repo })
    }
  }))

  return rawWorkflows
}

const calculateReport = (workflowsInInstallation: Workflow[][]): Reports => {
  const report: Reports = {
    workflows: [],
    actions: {}
  }

  // [ [ {workflow1.yml contents}, {workflow2.yml contents}], [{workflow1.yml contents}] ]
  workflowsInInstallation
    .forEach(workflowsInRepository => {
    // [ {workflow1.yml contents}, {workflow2.yml contents}]
      workflowsInRepository
      // { meta: 'path/to/workflow1.yml', raw: 'string of workflow1.yml contents in yaml' }
        .forEach(workflow => {
          const newWorkflowData: WorkflowData = {}
          const parser = new WorkflowParser(workflow.raw)

          // Workflow
          newWorkflowData.name = parser.getWorkflowName()
          newWorkflowData.path = workflow.meta
          newWorkflowData.triggers = parser.getTriggers()
          newWorkflowData.jobs_count = parser.getNumJobs()
          newWorkflowData.steps_count = parser.getNumSteps()
          report.workflows.push(newWorkflowData)

          // Actions
          const actionCountsPerFile = parser.getActionCountsPerFile()

          for (const key in actionCountsPerFile) {
            if (typeof report.actions[key] === 'number') {
              report.actions[key]++
            } else if (typeof report.actions[key] === 'undefined') {
              report.actions[key] = actionCountsPerFile[key]
            }
          }
        })
    })

  return report
}

// Return object with statistics about the GitHub Actions and workflows in this app's installation
const generateReport = async (owner: string): Promise<Reports> => {
  const reposWithOwner: string[] = await getReposWithOwner(owner)
  const workflows = (await Promise.all(reposWithOwner.map(getWorkflows)))
    .filter(w => typeof w !== 'undefined')
  const report = calculateReport(workflows)

  return report
}

const getReposWithOwner = async (owner: string): Promise<string[]> => {
  const repos: string[] | PromiseLike<string[]> = []
  // each response is a page of default length
  for await (const response of octokit.paginate.iterator(
    octokit.repos.listForUser,
    {
      type: 'owner',
      username: owner
    }
  )) {
    if (response.data.length) {
      response.data.map((repo: any) => repos.push(repo.full_name))
    }
  }
  return repos
}

const writeFile = async (filename: string, report: Reports) => {
  await fs.promises.writeFile(filename, JSON.stringify(report, null, 4))
}

const uploadArtifact = async (owner: string, filename: string, report: Reports) => {
  const artifactClient = artifact.create()
  const artifactName = filename
  const files = [filename]

  const rootDirectory = '.'
  const options = {
      continueOnError: false
  }

  await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
}

export async function run (): Promise<void> {
  try {
    const owner: string = core.getInput('owner')

    // If an owner is supplied, get repositories for that owner
    if (owner != null) {
      const report = await generateReport(owner)
      const ymd = (new Date()).toISOString().split('T')[0]
      const filename = `${ymd}-${owner}-report.json`

      core.debug(`report: ${JSON.stringify(report, null, 4)}`)

      await writeFile(filename, report)
      await uploadArtifact(owner, filename, report)

      core.setOutput('report', report)
    } else {
      core.setOutput('report', '[]')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

if (require.main === module) {
  run()
}
