const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

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

    /**
     * January 1st - March 31st  = First Quarter
     * April 1st - June 30th = Second Quarter
     * July 1st - September 30th = Third Quarter
     * October 1st - December 31st = Fourth Quarter
     */
    const getQuarter = (date = new Date()) => {
      return Math.floor(date.getMonth() / 3 + 1);
    };

    const generateCurrentEOCP = () => {
      const quarter = getQuarter();
      const year = new Date().getUTCFullYear();
      return `Q${quarter}/${year}`;
    };

    const ui5VersionsAndPatches = async () => {
      const { data } = await axios.get(
        "https://sapui5.hana.ondemand.com/versionoverview.json",
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      return data;
    };

    const getUi5Version = (raw) => {
      let n = raw.match(
        /https:\/\/sapui5.hana.ondemand.com\/(.*)\/resources\//i
      );
      let sapVersion = null;
      if (n && n.length > 1 && n[1]) {
        sapVersion = n[1];
      }

      return sapVersion;
    };

    const getEOCP = async (version) => {
      const { patches, versions } = await ui5VersionsAndPatches();
      return patches.filter((el) => el.version === version)[0];
    };

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
      eocpQuerter = quarter.replace("Q", "");

      let message = null;
      let code = null;

      if (year < currentYear) {
        code = 1;
        message = "You need to update, eocp was last year of earlier";
      } else if (year === currentYear && quarter < currentQuarter) {
        code = 2;
        message = "You need to update, eocp was one or more quarters back";
      } else if (year === currentYear && quarter === currentQuarter) {
        code = 3;
        message = "This quarter you need to update";
      } else if (year === currentYear && quarter > currentQuarter) {
        code = 4;
        message = "You will need to update in de near future";
      } else if (year > currentYear) {
        code = 5;
        message = "No need to worry";
      }

      return { code, message };
    };

    const { code, message } = EOCPcheck(eocp);

    if ([1, 2].includes(code)) {
      commentBody = `UI5 EOCP Check (${generateCurrentEOCP()})
            - UI5 version used in project: ${ui5Version} :worried:
            - EOCP of this version: ${eocp}

            - ${message}
        `;
    } else if ([3, 4].includes(code)) {
      commentBody = `UI5 EOCP Check (${generateCurrentEOCP()})
            - UI5 version used in project: ${ui5Version}
            - EOCP of this version: ${eocp}

            - ${message}
        `;
    } else if ([5].includes(code)) {
      commentBody = `UI5 EOCP Check (${generateCurrentEOCP()})
            - UI5 version used in project: ${ui5Version}
            - EOCP of this version: ${eocp.eocp}

            - ${message}
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
