export interface RepoWithOwner {
    owner: string
    repo: string
}

export interface Workflow {
    meta: string
    raw: string
}

export interface WorkflowData {
    name?: string
    path?: string
    triggers?: string[]
    jobs_count?: number
    steps_count?: number
}

export interface Reports {
    workflows: WorkflowData[]
    actions: {}
}

export interface File {
    type: string
    path: string
    html_url: string
}