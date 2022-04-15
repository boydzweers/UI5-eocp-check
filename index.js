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
    const owner = core.getInput("owner", { required: true });
    const repo = core.getInput("repo", { required: true });
    const token = core.getInput("token", { required: true });
    const path = core.getInput("pathToIndex", { required: true });
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
    const { eocp } = await getEOCP(ui5Version);

    let issueBody = null;

    const EOCPcheck = (eocp) => {
      const currentYear = new Date().getUTCFullYear();
      const currentQuarter = getQuarter();
      const [quarter, year] = eocp.split("/");
      const eocpQuerter = Number(quarter.replace("Q", ""));

      let message = null;
      let code = null;

      if (Number(year) < currentYear) {
        code = 1;
        message = "You need to update, eocp was last year of earlier.";
      } else if (Number(year) === currentYear && eocpQuerter < currentQuarter) {
        code = 2;
        message = "You need to update, eocp was one or more quarters back.";
      } else if (
        Number(year) === currentYear &&
        eocpQuerter === currentQuarter
      ) {
        code = 3;
        message = "This quarter you need to update.";
      } else if (Number(year) === currentYear && eocpQuerter > currentQuarter) {
        code = 4;
        message = "You will need to update in de near future.";
      }

      return { code, message };
    };

    const { code, message } = EOCPcheck(eocp);

    if ([1, 2].includes(code)) {
      issueBody = `SAPUI5 End of Cloud Provisioning Check (${generateCurrentEOCPFormat()})
            The version used is ${ui5Version}, and this version has a EOCP of ${eocp}
            ${message}
        `;
    } else if ([3, 4].includes(code)) {
      issueBody = `SAPUI5 End of Cloud Provisioning Check (${generateCurrentEOCPFormat()})
            The version used is ${ui5Version}, and this version has a EOCP of ${eocp}
            ${message}
        `;
    } else if ([5].includes(code)) {
      issueBody = `SAPUI5 End of Cloud Provisioning Check (${generateCurrentEOCPFormat()})
            The version used is ${ui5Version}, and this version has a EOCP of ${eocp}
            ${message}
        `;
    }

    await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner: owner,
      repo: repo,
      title: "SAPUI5 Version",
      body: issueBody,
      labels: ["EOCP"],
    });
  } catch (error) {
    core.setFailed(error);
  }
};

// Call the main function to run the action
main();
