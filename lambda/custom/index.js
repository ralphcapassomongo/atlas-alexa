/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const groupsService = require('./groupsService');
const clustersService = require('./clustersService');
const processesService = require('./processesService');
const { ObjectID } = require('mongodb-extjson').BSON;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = "Welcome to MongoDB Atlas!  I am excited to work with you!";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const ListProjectsIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ListProjects'
    );
  },

  async handle(handlerInput) {
    const groups = await groupsService.fetchGroups();

    let speechText = `You have ${groups.length} project${groups.length > 1 ? 's' : ''}.${' '}`;
    groups.forEach((g, i) => (speechText += `${i === groups.length - 1 ? ', and at' : ' At'} index ${i}, ${g.name}.`));

    // set the groups in the session
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    sessionAttributes.groups = groups;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const SetActiveProjectIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'SetActiveProject'
    );
  },

  async handle(handlerInput) {
    const groups = await groupsService.fetchGroups();

    const request = handlerInput.requestEnvelope.request;
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const index = request.intent.slots.index.value;

    if (!groups || index > groups.length - 1) {
      const speechText = `No project exists at index ${index}.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const selectedGroup = groups[index];
    const speechText = `${selectedGroup.name} selected.`;
    console.log('groups:', groups, 'index:', index);

    sessionAttributes.groupIndex = index;
    sessionAttributes.group = selectedGroup;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const ListClustersIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ListClusters'
    );
  },

  async handle(handlerInput) {
    console.log('handle list clusters');
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;

    if (!group) {
      const speechText = 'Please select a project in order to list clusters.  You can say, use project at index.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    console.log('fetching clusters for group:', group.id);
    const clusters = await clustersService.fetchClusters(group.id);
    let speechText = `You have ${clusters.length} cluster${clusters.length > 1 ? 's' : ''}.${' '}`;
    clusters.forEach(
      (c, i) => (speechText += `${i === clusters.length - 1 ? ', and at' : ' At'} index ${i}, ${c.name}.`)
    );

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const SetActiveClusterIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'SetActiveCluster'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    if (!group) {
      const speechText = 'No project selected.  You must select a project before you can select a cluster.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const clusters = await clustersService.fetchClusters(group.id);

    const request = handlerInput.requestEnvelope.request;
    const index = request.intent.slots.index.value;

    if (!clusters || index > clusters.length - 1) {
      const speechText = `No cluster exists at index ${index}.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const selectedCluster = clusters[index];
    const speechText = `${selectedCluster.name} selected.`;
    console.log('clusters:', clusters, 'index:', index);

    sessionAttributes.clusterIndex = index;
    sessionAttributes.cluster = selectedCluster;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const ClusterOverviewIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ClusterOverview'
    );
  },

  handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    let speechText = `${cluster.name} is a ${cluster.replicationFactor * cluster.numShards} node ${
      cluster.clusterType
    } cluster with an instance size of ${cluster.providerSettings.instanceSizeName}, running MongoDB version ${
      cluster.mongoDBVersion
    }.`;
    speechText += `${' '}The cluster is deployed on the ${
      cluster.providerSettings.providerName
    } platform in the ${cluster.providerSettings.regionName.replace(/_/g, ' ')} region.`;
    speechText += `${' '}Backups are ${cluster.backupEnabled ? 'enabled' : 'disabled'}.`;
    speechText += `${' '}The B.I. Connector is ${cluster.biConnector.enabled ? 'enabled' : 'disabled'}.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const ClusterStatusIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ClusterStatus'
    );
  },
  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    /*
                                                                                const group = sessionAttributes.group;
                                                                                const processes = await processesService.fetchProcesses(group.id, cluster.name);
                                                                                console.log('processes:', processes.length);
                                                                                */

    /*
                                                                                                const group = sessionAttributes.group;
                                                                                                const processes = processesService.fetchProcesses(group.id, cluster.name);
                                                                                                const connections =Promise.all(processes.then(async p => {
                                                                                                  await processesService.fetchMeasurementsForProcess(group.id, p.hostname, p.port, ['CONNECTIONS'], 'PT1M', 'PT1M');
                                                                                                  return 1;
                                                                                                }));
                                                                                                */

    // let speechText = `${cluster.name} is currently in a${cluster.stateName === 'IDLE' || cluster.stateName === 'UPDATING'? 'n':'' } ${cluster.stateName} state with ${connections} open connections.`;
    let speechText = `${cluster.name} is currently in a${
      cluster.stateName === 'IDLE' || cluster.stateName === 'UPDATING' ? 'n' : ''
    } ${cluster.stateName} state.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const EnableBIConnectorIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'EnableBIConnector'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const readPreferenceSlot = handlerInput.requestEnvelope.request.intent.readPreference;
    const update = {
      biConnector: {
        enabled: true,
        readPreference: readPreferenceSlot && readPreferenceSlot.value,
      },
    };

    const updatedCluster = await clustersService.updateCluster(group.id, cluster.name, update);
    const speechText = `The B.I. Connector is now enabled with a read preference of ${
      updatedCluster.biConnector.readPreference
    } on ${cluster.name}.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const DisableBIConnectorIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'DisableBIConnector'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const update = {
      biConnector: {
        enabled: false,
      },
    };

    await clustersService.updateCluster(group.id, cluster.name, update);
    const speechText = `The B.I. Connector is now disabled.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const DisableAutoScalingIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'DisableAutoScaling'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const update = {
      autoScaling: {
        diskGBEnabled: false,
      },
    };

    await clustersService.updateCluster(group.id, cluster.name, update);
    const speechText = 'Auto-scaling is now disabled.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const EnableAutoScalingIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'EnableAutoScaling'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const update = {
      autoScaling: {
        diskGBEnabled: true,
      },
    };

    await clustersService.updateCluster(group.id, cluster.name, update);
    const speechText = 'Auto-scaling is now enabled.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const SetNumShardsIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'SetNumShards'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    const cluster = sessionAttributes.cluster;

    if (!cluster) {
      const speechText = `Please select a cluster.  You can say use cluster at index.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const numShards = handlerInput.requestEnvelope.request.intent.slots.numShards.value;
    if (numShards < 1 || numShards > 12) {
      const speechText = `A cluster must have between 1 and 12 shards.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }
    if (cluster.numShards > 1 && numShards === 1) {
      const speechText = `Sharded cluster cannot be converted to replica sets.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const update = {
      numShards,
      clusterType: numShards === 1 ? 'REPLICASET' : 'SHARDED',
    };

    await clustersService.updateCluster(group.id, cluster.name, update);
    const speechText = `The number of shards is now changed to ${numShards}.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const CreateClusterIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'CreateCluster'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    if (!group) {
      const speechText = 'No project selected.  You must select a project before you can create a cluster.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const name = `TestCluster${Math.floor(Math.random() * 100)}`;
    const instanceSizeName = slots.instanceSize.value.toUpperCase();
    const providerName = slots.cloudProvider.value.toUpperCase();

    const regionValue = slots.usState.value.toLowerCase();

    let regionKey;
    switch (providerName) {
      case 'AWS':
        switch (regionValue) {
          case 'virginia':
            regionKey = 'US_EAST_1';
            break;
          case 'ohio':
            regionKey = 'US_EAST_2';
            break;
          case 'california':
            regionKey = 'US_WEST_1';
            break;
          case 'oregon':
            regionKey = 'US_WEST_2';
            break;
          default:
            break;
        }
        break;
      case 'AZURE':
        switch (regionValue) {
          case 'iowa':
            regionKey = 'US_CENTRAL';
            break;
          case 'virginia':
            regionKey = 'US_EAST_2';
            break;
          case 'illinois':
            regionKey = 'US_NORTH_CENTRAL';
            break;
          case 'california':
            regionKey = 'US_WEST';
            break;
          case 'texas':
            regionKey = 'US_SOUTH_CENTRAL';
            break;
          default:
            break;
        }
        break;
      case 'GCP':
        switch (regionValue) {
          case 'south carolina':
            regionKey = 'EASTERN_US';
            break;
          case 'virginia':
            regionKey = 'US_EAST_4';
            break;
          case 'iowa':
            regionKey = 'CENTRAL_US';
            break;
          case 'oregon':
            regionKey = 'WESTERN_US';
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }

    if (!regionKey) {
      const speechText = `A cluster cannot be created in the mentioned state. Please try again with a valid state.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const regionSpec = {};
    regionSpec[regionKey] = {
      electableNodes: 3,
      readOnlyNodes: 0,
      priority: 7,
    };
    const replicationSpec = {
      id: new ObjectID().toString(),
      zoneName: 'Zone 1',
      numShards: 1,
      regionsConfig: regionSpec,
    };

    const create = {
      name,
      providerSettings: {
        providerName,
        instanceSizeName,
      },
      replicationSpecs: [replicationSpec],
      clusterType: 'REPLICASET',
    };

    await clustersService.createCluster(group.id, create);
    const speechText = `The new cluster named ${name} is now being created.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const WhereAmIIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'WhereAmI'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const group = sessionAttributes.group;
    if (!group) {
      const speechText = `You are just getting started.  Please select a project.  Say list projects to get a list of all available projects.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    let speechText = `You are in the project, ${group.name}.`;

    const cluster = sessionAttributes.cluster;
    if (!cluster) {
      speechText += `${' '}You have not selected a cluster.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    speechText += `${' '}Cluster, ${cluster.name}, is selected.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const LeaveProjectIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'LeaveProject'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    const group = sessionAttributes.group;
    if (!group) {
      const speechText = 'No project is selected.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const speechText = `Group, ${group.name}, is no longer selected.`;
    sessionAttributes.group = undefined;
    sessionAttributes.cluster = undefined;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const LeaveClusterIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'LeaveCluster'
    );
  },

  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    const cluster = sessionAttributes.cluster;
    if (!cluster) {
      const speechText = 'No cluster is selected.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Atlas', speechText)
        .getResponse();
    }

    const speechText = `Cluster, ${cluster.name}, is no longer selected.`;
    sessionAttributes.cluster = undefined;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const TerminateAllClustersIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'TerminateAllClusters'
    );
  },

  async handle(handlerInput) {
    const speechText = "I realize that we are good friends, but I can't in good conscience terminate all of the clusters.  If you really wish to throw it all away, please use the UI.  It is much more amenable to such requests.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const ThankYouIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ThankYou'
    );
  },

  async handle(handlerInput) {
    const speechText = 'My pleasure.  Is there anythig else I can assist you with?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speechText = 'Start by saying, list projects.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'Done')
    );
  },
  handle(handlerInput) {
    const speechText = 'Thank you for using MongoDB Atlas!  I really enjoyed our time together.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Atlas', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please try again.")
      .reprompt("Sorry, I can't understand the command. Please try again.")
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpIntentHandler,
    ListProjectsIntentHandler,
    SetActiveProjectIntentHandler,
    ListClustersIntentHandler,
    SetActiveClusterIntentHandler,
    ClusterOverviewIntentHandler,
    ClusterStatusIntentHandler,
    EnableBIConnectorIntentHandler,
    DisableBIConnectorIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    DisableAutoScalingIntentHandler,
    EnableAutoScalingIntentHandler,
    SetNumShardsIntentHandler,
    WhereAmIIntentHandler,
    LeaveClusterIntentHandler,
    LeaveProjectIntentHandler,
<<<<<<< HEAD
    TerminateAllClustersIntentHandler,
    ThankYouIntentHandler,
=======
    CreateClusterIntentHandler
>>>>>>> 109dadec955fc6352cded1771718bb9bd4c53691
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
