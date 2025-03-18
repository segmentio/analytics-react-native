import { Adjust } from 'react-native-adjust';

export default () => {
  //resetSessionPartnerParameters is replaced with removeGlobalPartnerParameters in v5
  //TO DO : Remove commented lines in next release
  // Adjust.resetSessionPartnerParameters();
  Adjust.removeGlobalPartnerParameters();

};
