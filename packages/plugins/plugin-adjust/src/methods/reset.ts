import { Adjust } from 'react-native-adjust';

export default () => {
  //resetSessionPartnerParameters is replaced with removeGlobalPartnerParameters in v5
  // Adjust.resetSessionPartnerParameters();
  Adjust.removeGlobalPartnerParameters();

};
