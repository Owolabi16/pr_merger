const core = require('@actions/core');  // For working with GitHub Actions input/output
const github = require('@actions/github');  // For interacting with the GitHub API

async function run() {
  try {
    // Step 1: Get input and initialize GitHub API client
    const branch = core.getInput('branch');  // Get the input branch name (e.g., 'main', 'feature-x')
    const token = core.getInput('token');  // Get the GitHub token for authentication
    const octokit = github.getOctokit(token);  // Initialize the GitHub API client

    // Get the repository context (repo owner and name) from GitHub Actions environment
    const { owner, repo } = github.context.repo;

    // Log which branch is being scanned
    console.log(`Scanning for PRs from branch: ${branch}`);

    // Step 2: Get open PRs from the specified branch (head) and their target branch (base)
    const prs = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',  // Only open PRs
      head: `${owner}:${branch}`,  // Source branch (head) is the branch passed as input
      per_page: 100,  // Limit to 100 PRs per call (adjust as needed)
    });

    // Step 3: Filter the PRs that match the specified branch
    const prList = prs.data.filter(pr => pr.head.ref === branch);  // Ensure source branch matches input

    // Log the number of PRs found
    console.log(`Found ${prList.length} PR(s) from branch ${branch}`);

    // Step 4: Merge each PR found
    for (const pr of prList) {
      console.log(`Attempting to merge PR #${pr.number} from ${pr.head.ref} into ${pr.base.ref}`);

      try {
        // Merge the PR using Octokit
        await octokit.rest.pulls.merge({
          owner,
          repo,
          pull_number: pr.number,
        });
        console.log(`Successfully merged PR #${pr.number}`);
      } catch (mergeError) {
        // Log error if merge fails
        console.error(`Failed to merge PR #${pr.number}: ${mergeError.message}`);
      }
    }

    // Step 5: Set the output for the list of merged PRs (optional for debugging)
    core.setOutput('pr_list', JSON.stringify(prList));
  } catch (error) {
    // In case of any errors, set the action as failed
    core.setFailed(error.message);
  }
}

// Run the function
run();
