const config = require("config/config");
const requestPromise = require("request-promise");

module.exports = {
  fetchProcesses(groupId, clusterName) {
    const options = {
      uri: `${config.atlas.url}/groups/${groupId}/processes`,
      json: true,
      auth: {
        user: config.atlas.username,
        pass: config.atlas.apiKey,
        sendImmediately: false
      }
    };
    return requestPromise(options).then(response => {
      const results = response.results;
      if (!clusterName) {
        return results;
      }
      return results.filter(
        p => p.replicaSetName === clusterName || p.shardName === clusterName
      );
    });
  },

  fetchMeasurementsForProcess(
    groupId,
    host,
    port,
    measurements,
    granularity,
    period
  ) {
    const mesaurementQueryParams = measurements.map(m => `m=${m}`).join("&");
    const options = {
      uri: `${
        config.atlas.url
      }/groups/${groupId}/processes/${host}:${port}/measurements?${mesaurementQueryParams}&granularity=${granularity}&period=${period}`,
      json: true,
      auth: {
        user: config.atlas.username,
        pass: config.atlas.apiKey,
        sendImmediately: false
      }
    };
    console.log('p uri:', options.uri);
    return requestPromise(options).then(response => {
      return response.results;
    });
  },
};
