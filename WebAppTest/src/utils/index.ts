export const createPageUrl = (pageName: string): string => {
  const routes: { [key: string]: string } = {
    Dashboard: '/dashboard',
    Cards: '/cards',
    Analytics: '/analytics',
    Profile: '/profile'
  };
  return routes[pageName] || '/';
};