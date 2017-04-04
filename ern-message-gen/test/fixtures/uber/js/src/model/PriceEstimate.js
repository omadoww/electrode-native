/**
 * Uber API
 * Move your app forward with the Uber API
 *
 * OpenAPI spec version: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.UberApi) {
      root.UberApi = {};
    }
    root.UberApi.PriceEstimate = factory(root.UberApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';


  /**
   * The PriceEstimate model module.
   * @module model/PriceEstimate
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>PriceEstimate</code>.
   * @alias module:model/PriceEstimate
   * @class
   */
  var exports = function() {
    var _this = this;








  };

  /**
   * Constructs a <code>PriceEstimate</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/PriceEstimate} obj Optional instance to populate.
   * @return {module:model/PriceEstimate} The populated <code>PriceEstimate</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('product_id')) {
        obj['product_id'] = ApiClient.convertToType(data['product_id'], 'String');
      }
      if (data.hasOwnProperty('currency_code')) {
        obj['currency_code'] = ApiClient.convertToType(data['currency_code'], 'String');
      }
      if (data.hasOwnProperty('display_name')) {
        obj['display_name'] = ApiClient.convertToType(data['display_name'], 'String');
      }
      if (data.hasOwnProperty('estimate')) {
        obj['estimate'] = ApiClient.convertToType(data['estimate'], 'String');
      }
      if (data.hasOwnProperty('low_estimate')) {
        obj['low_estimate'] = ApiClient.convertToType(data['low_estimate'], 'Number');
      }
      if (data.hasOwnProperty('high_estimate')) {
        obj['high_estimate'] = ApiClient.convertToType(data['high_estimate'], 'Number');
      }
      if (data.hasOwnProperty('surge_multiplier')) {
        obj['surge_multiplier'] = ApiClient.convertToType(data['surge_multiplier'], 'Number');
      }
    }
    return obj;
  }
  /**
   * Unique identifier representing a specific product for a given latitude &amp; longitude. For example, uberX in San Francisco will have a different product_id than uberX in Los Angeles
   * @member {String} product_id
   */
  exports.prototype['product_id'] = undefined;
  /**
   * [ISO 4217](http://en.wikipedia.org/wiki/ISO_4217) currency code.
   * @member {String} currency_code
   */
  exports.prototype['currency_code'] = undefined;
  /**
   * Display name of product.
   * @member {String} display_name
   */
  exports.prototype['display_name'] = undefined;
  /**
   * Formatted string of estimate in local currency of the start location. Estimate could be a range, a single number (flat rate) or &quot;Metered&quot; for TAXI.
   * @member {String} estimate
   */
  exports.prototype['estimate'] = undefined;
  /**
   * Lower bound of the estimated price.
   * @member {Number} low_estimate
   */
  exports.prototype['low_estimate'] = undefined;
  /**
   * Upper bound of the estimated price.
   * @member {Number} high_estimate
   */
  exports.prototype['high_estimate'] = undefined;
  /**
   * Expected surge multiplier. Surge is active if surge_multiplier is greater than 1. Price estimate already factors in the surge multiplier.
   * @member {Number} surge_multiplier
   */
  exports.prototype['surge_multiplier'] = undefined;

  return exports;
}));
