import { AiExternalEndpointsGetters } from '../services/aiService/aiExternalEndpoints';
import { updateAiExternalEndpointDocumentation } from '../services/aiService/aiExternalEndpointDocumentation';

const fetchAiExternalDocs = async () => {
  for (const endpointName of Object.keys(AiExternalEndpointsGetters)) {
    console.log(`Fetching AI external API docs: ${endpointName}`);

    const result = await updateAiExternalEndpointDocumentation(endpointName);

    console.log(
      `Generated ${result.endpoints} endpoints for ${result.endpoint}`,
    );
  }
};

fetchAiExternalDocs().catch((error) => {
  console.error('Failed to fetch AI external API docs:', error);
  process.exit(1);
});
