module.exports = (config, options) => {
  options = options || {};
  const androidAppLinks = options?.androidAppLinks ?? [];
  const updatedConfig = {
    ...config,
    android: {
      ...config.android,
      intentFilters: (config.android?.intentFilters ?? []).concat(androidAppLinks.map(href => {
        const url = new URL(href);
        return {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": url.host,
              "pathPrefix": url.pathname
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      }))
    }
  };

  return updatedConfig;
}