export const createPageUrl = (pageName: string): string => {
  const routes: { [key: string]: string } = {
    Dashboard: '/Dashboard',
    Cards: '/Cards',
    Analytics: '/Analytics',
    Profile: '/Profile',
    CampaignTest: '/CampaignTest',
  };
  return routes[pageName] || '/';
};