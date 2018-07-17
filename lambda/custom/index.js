/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const groupsService = require('./groupsService');
const clustersService = require('./clustersService');


const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to MongoDB Atlas!  You\'re going to love it here!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const HelloWorldIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
  },
  handle(handlerInput) {
    const speechText = 'Hello World, I am Ralph!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const ListProjectsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ListProjects';
  },

  async handle(handlerInput) {
    const groups = await groupsService.fetchGroups();

    let speechText = `You have ${groups.length} project${groups.length > 1 ? 's': ''}.${' '}`;
    groups.forEach((g, i) => speechText += `${i === groups.length - 1 ? ', and at' : ' At'} index ${i}, ${g.name}.`);

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
}

const SetActiveProjectIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SetActiveProject';
  },

  async handle(handlerInput) {
    const groups = await groupsService.fetchGroups();

    const request = handlerInput.requestEnvelope.request;
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const index = request.intent.slots.index.value;

    if (!groups || index > groups.length - 1) {
      const speechText = `No cluster exists at index ${index}.`
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
  }
}

const ListClustersIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ListClusters';
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
    let speechText = `You have ${clusters.length} cluster${clusters.length > 1 ? 's': ''}.${' '}`;
    clusters.forEach((c, i) => speechText += `${i === clusters.length - 1 ? ', and at' : ' At'} index ${i}, ${c.name}.`);

    return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(speechText)
    .withSimpleCard('Atlas', speechText)
    .getResponse();
  }
}

const SetActiveClusterIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SetActiveCluster';
  },

  async handle(handlerInput) {
    const clusters = await clustersService.fetchClusters();

    const request = handlerInput.requestEnvelope.request;
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const index = request.intent.slots.index.value;
    
    if (!clusters || index > clusters.length - 1) {
      const speechText = `No cluster exists at index ${index}.`
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
  }
}

const ClusterOverviewIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ClusterOverview';
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

    let speechText = `${cluster.name} is a ${cluster.replicationFactor * cluster.numShards} node ${cluster.type} of instance size ${cluster.providerSettings.instanceSizeName} running MongoDB ${cluster.mongoDBVersion}.`
    speechText += `${' '}The cluster is deployed on the ${providerSettings.providerName} platform in the ${providerSettings.regionName} region.`;
    speechText += `${' '}Backups are ${cluster.backupEnabled ? 'enabled': 'disabled'}.`;
    speechText += `${' '}The BI Connector is ${biConnector.enabled ? 'enabled' : 'disabled'}.`;

    return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(speechText)
    .withSimpleCard('Atlas', speechText)
    .getResponse();
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
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
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    HelpIntentHandler,
    ListProjectsIntentHandler,
    SetActiveProjectIntentHandler,
    ListClustersIntentHandler,
    SetActiveClusterIntentHandler,
    ClusterOverviewIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
