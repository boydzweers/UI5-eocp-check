const core = require("@actions/core");
const github = require("@actions/github");
const {
  getQuarter,
  generateCurrentEOCPFormat,
  getUi5Version,
  getEOCP,
} = require("./utils");

const main = async () => {
  try {
    /**
     * We need to fetch all the inputs that were provided to our action
     * and store them in variables for us to use.
     **/
    const owner = core.getInput("owner", { required: true });
    const repo = core.getInput("repo", { required: true });
    const issueNumber = core.getInput("issueNumber", { required: true });
    const token = core.getInput("token", { required: true });
    const path = core.getInput("pathToIndex", { required: true });
    const failOnEOCP = core.getInput("failOnEOCP", { required: true });

    console.log({ path, failOnEOCP });

    /**
     * Now we need to create an instance of Octokit which will use to call
     * GitHub's REST API endpoints.
     * We will pass the token as an argument to the constructor. This token
     * will be used to authenticate our requests.
     * You can find all the information about how to use Octokit here:
     * https://octokit.github.io/rest.js/v18
     **/
    const octokit = new github.getOctokit(token);

    const { data } = await octokit.rest.repos.getContent({
      mediaType: {
        format: "raw",
      },
      owner: owner,
      repo: repo,
      path: path,
    });

    const ui5Version = getUi5Version(data);
    const { eocp, version } = await getEOCP(ui5Version);

    let commentBody = null;

    const EOCPcheck = (eocp) => {
      const currentYear = new Date().getUTCFullYear();
      const currentQuarter = getQuarter();
      const [quarter, year] = eocp.split("/");
      const eocpQuerter = Number(quarter.replace("Q", ""));

      console.log({ currentYear, currentQuarter, quarter, year, eocpQuerter });

      let message = null;
      let code = null;

      if (Number(year) < currentYear) {
        code = 1;
        message = "You need to update, eocp was last year of earlier";
      } else if (Number(year) === currentYear && eocpQuerter < currentQuarter) {
        code = 2;
        message = "You need to update, eocp was one or more quarters back";
      } else if (
        Number(year) === currentYear &&
        eocpQuerter === currentQuarter
      ) {
        code = 3;
        message = "This quarter you need to update";
      } else if (Number(year) === currentYear && eocpQuerter > currentQuarter) {
        code = 4;
        message = "You will need to update in de near future";
      } else if (Number(year) > currentYear) {
        code = 5;
        message = "No need to worry";
      }

      console.log({ code, message });

      return { code, message };
    };

    const { code, message } = EOCPcheck(eocp);

    if ([1, 2].includes(code)) {
      commentBody = `SAPUI5 End of Cloud Provisioning Check (${generateCurrentEOCPFormat()})
            The version used is ${ui5Version}, and this version has a EOCP of ${eocp}
            ${message}
        `;
    } else if ([3, 4].includes(code)) {
      commentBody = `SAPUI5 End of Cloud Provisioning Check (${generateCurrentEOCPFormat()})
            The version used is ${ui5Version}, and this version has a EOCP of ${eocp}
            ${message}
        `;
    } else if ([5].includes(code)) {
      commentBody = `SAPUI5 End of Cloud Provisioning Check (${generateCurrentEOCPFormat()})
            The version used is ${ui5Version}, and this version has a EOCP of ${eocp}
            ${message}
        `;
    }

    /**
     * Create a comment on the PR with the information we compiled from the
     * list of changed files.
     */
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody,
    });

    if ([1, 2].includes(code) && failOnEOCP === true) {
      core.setFailed(message);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

// Call the main function to run the action
main();
