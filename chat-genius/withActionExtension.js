const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withActionExtension = (expoConfig) => {
  return withXcodeProject(expoConfig, async (config) => {
    const xcodeProject = config.modResults;
    const extensionName = 'ActionExtension';
    const extensionBundleId = `${expoConfig.ios.bundleIdentifier}.${extensionName}`;

    // 1. Target Create Karein
    const target = xcodeProject.addTarget(extensionName, 'app_extension', extensionName);

    // 🔥 THE FIX: Explicitly Build Phases create karein taake Swift code compile ho 🔥
    xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

    // 2. Add Swift File to Target's Compile Sources
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addSourceFile(
      `${extensionName}/ActionViewController.swift`,
      { target: target.uuid },
      mainGroup
    );

    // 3. Frameworks Add Karein
    xcodeProject.addFramework('UIKit.framework', { target: target.uuid });
    xcodeProject.addFramework('MobileCoreServices.framework', { target: target.uuid });
    xcodeProject.addFramework('UniformTypeIdentifiers.framework', { target: target.uuid });

    // 4. Build Settings Apply Karein
    const pbxNativeTarget = target.pbxNativeTarget;
    if (pbxNativeTarget && pbxNativeTarget.buildConfigurationList) {
      const buildConfigListUuid = pbxNativeTarget.buildConfigurationList;
      const buildConfigList = xcodeProject.pbxXCConfigurationList()[buildConfigListUuid];

      if (buildConfigList && buildConfigList.buildConfigurations) {
        buildConfigList.buildConfigurations.forEach(buildConfigRef => {
          const buildConfig = xcodeProject.pbxXCBuildConfigurationSection()[buildConfigRef.value];
          if (buildConfig && buildConfig.buildSettings) {
            buildConfig.buildSettings['PRODUCT_BUNDLE_IDENTIFIER'] = `"${extensionBundleId}"`;
            buildConfig.buildSettings['INFOPLIST_FILE'] = '"ActionExtension/ActionExtension-Info.plist"';
            buildConfig.buildSettings['MARKETING_VERSION'] = `"${expoConfig.version || '1.0.0'}"`;
            buildConfig.buildSettings['CURRENT_PROJECT_VERSION'] = `"${expoConfig.ios?.buildNumber || '1'}"`;
            buildConfig.buildSettings['SWIFT_VERSION'] = '"5.0"';
            // Apple ki strict extension policies bypass karne ke liye lazmi tags
            buildConfig.buildSettings['SKIP_INSTALL'] = '"YES"';
            buildConfig.buildSettings['GENERATE_INFOPLIST_FILE'] = '"NO"';
            buildConfig.buildSettings['CODE_SIGN_ENTITLEMENTS'] = '"ActionExtension/ActionExtension.entitlements"';
          }
        });
      }
    }

    return config;
  });
};

const withExtensionFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const extensionPath = path.join(config.modRequest.platformProjectRoot, 'ActionExtension');
      const sourcePath = path.join(config.modRequest.projectRoot, 'ios-extension');

      if (!fs.existsSync(extensionPath)) {
        fs.mkdirSync(extensionPath, { recursive: true });
      }

      fs.copyFileSync(
        path.join(sourcePath, 'Info.plist'),
        path.join(extensionPath, 'ActionExtension-Info.plist')
      );
      fs.copyFileSync(
        path.join(sourcePath, 'ActionViewController.swift'),
        path.join(extensionPath, 'ActionViewController.swift')
      );
      fs.copyFileSync(
        path.join(sourcePath, 'ActionExtension.entitlements'),
        path.join(extensionPath, 'ActionExtension.entitlements')
      );

      return config;
    },
  ]);
};

const withPodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, 'utf8');

        const fixCode = `
      installer.pods_project.targets.each do |target|
        if target.respond_to?(:product_type) and target.product_type == "com.apple.product-type.bundle"
          target.build_configurations.each do |config|
              config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          end
        end
      end`;

        if (!podfile.includes("CODE_SIGNING_ALLOWED")) {
          podfile = podfile.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|\n${fixCode}`
          );
          fs.writeFileSync(podfilePath, podfile);
        }
      }
      return config;
    }
  ]);
};

module.exports = (config) => {
  config = withActionExtension(config);
  config = withExtensionFiles(config);
  config = withPodfileFix(config);
  return config;
};