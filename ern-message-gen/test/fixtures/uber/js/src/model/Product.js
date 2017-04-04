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
    root.UberApi.Product = factory(root.UberApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';


  /**
   * The Product model module.
   * @module model/Product
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Product</code>.
   * @alias module:model/Product
   * @class
   */
  var exports = function() {
    var _this = this;






  };

  /**
   * Constructs a <code>Product</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Product} obj Optional instance to populate.
   * @return {module:model/Product} The populated <code>Product</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('product_id')) {
        obj['product_id'] = ApiClient.convertToType(data['product_id'], 'String');
      }
      if (data.hasOwnProperty('description')) {
        obj['description'] = ApiClient.convertToType(data['description'], 'String');
      }
      if (data.hasOwnProperty('display_name')) {
        obj['display_name'] = ApiClient.convertToType(data['display_name'], 'String');
      }
      if (data.hasOwnProperty('capacity')) {
        obj['capacity'] = ApiClient.convertToType(data['capacity'], 'String');
      }
      if (data.hasOwnProperty('image')) {
        obj['image'] = ApiClient.convertToType(data['image'], 'String');
      }
    }
    return obj;
  }
  /**
   * Unique identifier representing a specific product for a given latitude &amp; longitude. For example, uberX in San Francisco will have a different product_id than uberX in Los Angeles.
   * @member {String} product_id
   */
  exports.prototype['product_id'] = undefined;
  /**
   * Description of product.
   * @member {String} description
   */
  exports.prototype['description'] = undefined;
  /**
   * Display name of product.
   * @member {String} display_name
   */
  exports.prototype['display_name'] = undefined;
  /**
   * Capacity of product. For example, 4 people.
   * @member {String} capacity
   */
  exports.prototype['capacity'] = undefined;
  /**
   * Image URL representing the product.
   * @member {String} image
   */
  exports.prototype['image'] = undefined;

  return exports;
}));
