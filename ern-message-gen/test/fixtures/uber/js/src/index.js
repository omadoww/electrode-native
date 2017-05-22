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
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Activities', 'model/Activity', 'model/Error', 'model/PriceEstimate', 'model/Product', 'model/Profile', 'api/EstimatesApi', 'api/ProductsApi', 'api/UserApi'], factory)
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('./ApiClient'), require('./model/Activities'), require('./model/Activity'), require('./model/Error'), require('./model/PriceEstimate'), require('./model/Product'), require('./model/Profile'), require('./api/EstimatesApi'), require('./api/ProductsApi'), require('./api/UserApi'))
  }
}(function (ApiClient, Activities, Activity, Error, PriceEstimate, Product, Profile, EstimatesApi, ProductsApi, UserApi) {
  'use strict'

  /**
   * Move_your_app_forward_with_the_Uber_API.<br>
   * The <code>index</code> module provides access to constructors for all the classes which comprise the public API.
   * <p>
   * An AMD (recommended!) or CommonJS application will generally do something equivalent to the following:
   * <pre>
   * var UberApi = require('index'); // See note below*.
   * var xxxSvc = new UberApi.XxxApi(); // Allocate the API class we're going to use.
   * var yyyModel = new UberApi.Yyy(); // Construct a model instance.
   * yyyModel.someProperty = 'someValue';
   * ...
   * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
   * ...
   * </pre>
   * <em>*NOTE: For a top-level AMD script, use require(['index'], function(){...})
   * and put the application logic within the callback function.</em>
   * </p>
   * <p>
   * A non-AMD browser application (discouraged) might do something like this:
   * <pre>
   * var xxxSvc = new UberApi.XxxApi(); // Allocate the API class we're going to use.
   * var yyy = new UberApi.Yyy(); // Construct a model instance.
   * yyyModel.someProperty = 'someValue';
   * ...
   * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
   * ...
   * </pre>
   * </p>
   * @module index
   * @version 1.0.0
   */
  var exports = {
    /**
     * The ApiClient constructor.
     * @property {module:ApiClient}
     */
    ApiClient: ApiClient,
    /**
     * The Activities model constructor.
     * @property {module:model/Activities}
     */
    Activities: Activities,
    /**
     * The Activity model constructor.
     * @property {module:model/Activity}
     */
    Activity: Activity,
    /**
     * The Error model constructor.
     * @property {module:model/Error}
     */
    Error: Error,
    /**
     * The PriceEstimate model constructor.
     * @property {module:model/PriceEstimate}
     */
    PriceEstimate: PriceEstimate,
    /**
     * The Product model constructor.
     * @property {module:model/Product}
     */
    Product: Product,
    /**
     * The Profile model constructor.
     * @property {module:model/Profile}
     */
    Profile: Profile,
    /**
     * The EstimatesApi service constructor.
     * @property {module:api/EstimatesApi}
     */
    EstimatesApi: EstimatesApi,
    /**
     * The ProductsApi service constructor.
     * @property {module:api/ProductsApi}
     */
    ProductsApi: ProductsApi,
    /**
     * The UserApi service constructor.
     * @property {module:api/UserApi}
     */
    UserApi: UserApi
  }

  return exports
}))
