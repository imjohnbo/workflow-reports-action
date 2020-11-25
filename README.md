<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Workflow Reports Action

An action for generating reports on how a user or organization (`owner`) is using GitHub Actions. It parses the workflows of the _default branch_ and produces JSON report artifact that you may download.

Why? So you can:
- See **which actions your org depends on**, including versions
- Get a **clickable list of all workflows**
- Gain insight into **what triggers your workflows**
- Understand the **length and complexity of your workflows**

_Note: This action is in early stages. Please consider opening an issue for feedback and feature requests._ 🙌

## Usage

### Manual report

```yaml
on:
  workflow_dispatch:
    inputs:
      owner:
        description: 'Owner of actions to retrieve'
        required: true

name: Generate report

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: imjohnbo/workflow-reports-action@v0 # still in early stages :-)
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        owner: octocat # user or org, e.g. octocat or octocat-org
```

### Scheduled report

```yaml
on:
  # https://crontab.guru/
  schedule:	
  - cron: 0 12 1 * *

name: Generate report

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: imjohnbo/workflow-reports-action@v0 # still in early stages :-)
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        owner: octocat-org # user or org, e.g. octocat or octocat-org
```

## Example report

```js
{
    workflows: [
        {
            name: 'My Workflow',
            path: 'https://github.com/path/to/my-workflow.yml',
            triggers: '"push"',
            jobs_count: 1,
            steps_count: 1
        },
        {
            name: 'Test Workflow',
            path:
                'https://github.com/path/to/my-test-workflow.yml',
            triggers: {
                "pull_request": {
                    "types": [
                        "opened",
                        "reopened"
                    ]
                }
            }
        }
    ],
    actions: {
        'actions/checkout@v1': 4,
        'octokit/request-action@v1.x': 1,
        './': 1,
        'actions/setup-node@v1': 2
    }
}
```

## Known limitations

Known limitations:
- Rate limits with `GITHUB_TOKEN` could be a problem when generating a report for a larger organization.
  - Workaround: use a Personal Access Token or GitHub App installation access token for a higher limit
- Only reports on workflows in the default branch

## Contributing

[Pull requests](https://github.com/imjohnbo/workflow-reports-action/pulls) and [feature requests](https://github.com/imjohnbo/workflow-reports-action/issues) welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for more.

## License

[MIT](LICENSE)
