import SwaggerUIBundle from "./swagger-ui-bundle.js";
import SwaggerUIStandalonePreset from "./swagger-ui-standalone-preset.js";
import absolutePath from "./absolute-path.js";

let bundle, preset, path;

try {
  bundle = SwaggerUIBundle;
  preset = SwaggerUIStandalonePreset;
} catch(e) {
  // swallow the error if there's a problem loading the assets.
  // allows this module to support providing the assets for browserish contexts,
  // without exploding in a Node context.
  //
  // see https://github.com/swagger-api/swagger-ui/issues/3291#issuecomment-311195388
  // for more information.
}

try {
  path = absolutePath;
} catch(e) {
  // swallow the error for absolute path
}

// ES Module exports
// `absolutePath` and `getAbsoluteFSPath` are both here because at one point,
// we documented having one and actually implemented the other.
// They were both retained so we don't break anyone's code.
export { 
  bundle as SwaggerUIBundle,
  preset as SwaggerUIStandalonePreset,
  path as absolutePath,
  path as getAbsoluteFSPath
};
