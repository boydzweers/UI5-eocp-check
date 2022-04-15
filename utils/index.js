const axios = require("axios");

const getQuarter = (date = new Date()) => {
  return Math.floor(date.getMonth() / 3 + 1);
};

const generateCurrentEOCPFormat = () => {
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
  let n = raw.match(/https:\/\/sapui5.hana.ondemand.com\/(.*)\/resources\//i);
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

modules.exports = {
  getQuarter,
  generateCurrentEOCPFormat,
  getUi5Version,
  getEOCP,
};
