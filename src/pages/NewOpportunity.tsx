import { View, Heading } from '@adobe/react-spectrum';
import OpportunityForm from '../components/OpportunityForm';

export default function NewOpportunity() {
  return (
    <View>
      <Heading level={1} marginBottom="size-300">New Opportunity</Heading>
      <OpportunityForm />
    </View>
  );
}
