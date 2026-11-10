import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP = 'group.com.socialgenius.app2026';

export const syncProToExtension = async (isPro: boolean) => {
  try {
    await SharedGroupPreferences.setItem('is_pro_user', isPro ? 'true' : 'false', APP_GROUP);
  } catch (e) {
    console.log('Extension pro sync error:', e);
  }
};