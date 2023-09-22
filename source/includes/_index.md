# Using Kill Bill APIs

## Introduction

Kill Bill offers a set of HTTP APIs, commonly called REST APIs, that use the HTTP verbs `POST`, `GET`, `PUT`, `DELETE` to invoke Create, Read, Update and Delete (CRUD) operations, and that use HTTP response codes to indicate errors. These APIs enable the management of Kill Bill resources -- e.g `Account` -- through the use of JSON input and output.

Kill Bill also offers a set of [java APIs](https://github.com/killbill/killbill-api/tree/master/src/main/java/org/killbill/billing) that can be used by plugins to make requests, and a set of [java plugin APIs](https://github.com/killbill/killbill-plugin-api) for Kill Bill core to interact with the plugins. These apis are beyond the scope of this documentation.


Official libraries for the Kill Bill API are available in several languages,
including Java, Php, Python, Ruby, Node, and Go. Community-supported libraries
such as .NET are also available. Note that code examples for Curl, Java, Ruby and Python are shown in the right-hand column of this document.

In the following documentation, we assume
you have a Kill Bill server instance running on `127.0.0.1` on port `8080`. It is straightforward to substitute a different IP address or port number if necessary.

Kill Bill supports the `https` protocol, but here all examples are shown using `http`.

> API client libraries


```java
//
// You can find the java client on github: https://github.com/killbill/killbill-client-java
//
```

```ruby
#
# You can find the ruby client on github: https://github.com/killbill/killbill-client-ruby
#
```

The description of the API in this documentation is limited to the most common use cases and does not include advanced features that we have crafted over the years from all the use cases we have seen from our users.

For questions about API use, or to report bugs, you can subscribe to the [Kill Bill user mailing list](https://groups.google.com/forum/#!forum/killbilling-users).


## Authentication and RBAC

In order to make API calls, one needs to authenticate each request by passing an HTTP `Authorization` header and by following the HTTP Basic authentication scheme.


Depending on how the system has been configured, the authentication mechanism can happen using different options -- some or all at the same time:

* Flat file configuration
* Database configuration
* LDAP configuration
* OKTA configuration

 The system also supports configuring roles and permissions, to restrict user access to certain resources and operations. The permissions are quite granular and are defined [here](https://github.com/killbill/killbill-api/blob/master/src/main/java/org/killbill/billing/security/Permission.java#L19)

## Multi-Tenancy

Kill Bill has been designed from the ground up to run multiple logical instances on the same set of servers and databases. This allows different customer data sets to be cleanly separated. Another common use case is to configure both a production tenant and a test tenant, the latter being used for test requests during deployment and for sanity after deployment.

Each API call requires the tenant being used to be identified, through the use of 2 HTTP headers:

* **`X-Killbill-ApiKey`**: The API key associated with the tenant. This value is stored in clear in the database.
* **`X-Killbill-ApiSecret`**: The API secret associated with the tenant. This value is hashed and stored along with the `salt` in the database

<aside class="note">
  <span class="note__title">Note:</span> 
  <span class="note__content">
    You can control the number of hash iterations through the system property `org.killbill.security.shiroNbHashIterations` whose default value is set to `200000`. If your security requirements are met through other means, you can set this value to `1` to avoid wasting CPU cycles and greatly improve latency. Changing the value on an existing system requires re-hashing the keys.
  </span>
</aside>


> Specifying the basic authentication headers and multi-tenancy headers:

```shell
curl \
-u admin:password \
-H "X-Killbill-ApiKey: bob" \
-H "X-Killbill-ApiSecret: lazar" \
...
```

```java
KillBillHttpClient killBillHttpClient = new KillBillHttpClient(String.format("http://%s:%d", "127.0.0.1", 8080),
                                                               username,
                                                               password,
                                                               apiKey,
                                                               apiSecret,
                                                               null,
                                                               null,
                                                               1000,
                                                               5000,
                                                               5000);

AccountApi accountApi = new AccountApi(killBillHttpClient);
AdminApi adminApi = new AdminApi(killBillHttpClient);
BundleApi bundleApi = new BundleApi(killBillHttpClient);
CatalogApi catalogApi = new CatalogApi(killBillHttpClient);
CreditApi creditApi = new CreditApi(killBillHttpClient);
CustomFieldApi customFieldApi = new CustomFieldApi(killBillHttpClient);
ExportApi exportApi = new ExportApi(killBillHttpClient);
InvoiceApi invoiceApi = new InvoiceApi(killBillHttpClient);
InvoiceItemApi invoiceItemApi = new InvoiceItemApi(killBillHttpClient);
InvoicePaymentApi invoicePaymentApi = new InvoicePaymentApi(killBillHttpClient);
NodesInfoApi nodesInfoApi = new NodesInfoApi(killBillHttpClient);
OverdueApi overdueApi = new OverdueApi(killBillHttpClient);
PaymentApi paymentApi = new PaymentApi(killBillHttpClient);
PaymentGatewayApi paymentGatewayApi = new PaymentGatewayApi(killBillHttpClient);
PaymentMethodApi paymentMethodApi = new PaymentMethodApi(killBillHttpClient);
PaymentTransactionApi paymentTransactionApi = new PaymentTransactionApi(killBillHttpClient);
PluginInfoApi pluginInfoApi = new PluginInfoApi(killBillHttpClient);
SecurityApi securityApi = new SecurityApi(killBillHttpClient);
SubscriptionApi subscriptionApi = new SubscriptionApi(killBillHttpClient);
TagApi tagApi = new TagApi(killBillHttpClient);
TagDefinitionApi tagDefinitionApi = new TagDefinitionApi(killBillHttpClient);
TenantApi tenantApi = new TenantApi(killBillHttpClient);
UsageApi usageApi = new UsageApi(killBillHttpClient);

// Request Options example
String createdBy = "me";
String reason = "Going through my first tutorial";
String comment = "I like it!";

String apiKey = "bob";
String apiSecret = "lazar";


RequestOptions requestOptions = RequestOptions.builder()
                                              .withCreatedBy(createdBy)
                                              .withReason(reason)
                                              .withComment(comment)
                                              .withQueryParams(queryParams)
                                              .withTenantApiKey(apiKey)
                                              .withTenantApiSecret(apiSecret)
                                              .build();
```


```ruby
require 'killbill_client'

KillBillClient.url = 'http://127.0.0.1:8080'

# Multi-tenancy and RBAC credentials
options = {
  :username => 'admin',
  :password => 'password',
  :api_key => 'bob',
  :api_secret => 'lazar'
}

# Audit log data
user = 'me'
reason = 'Going through my first tutorial'
comment = 'I like it!'

# Start using....

```

```python
# Edit file: configuration.py, lines:50-62

# Default Base url
self.host = "http://localhost:8080"
# Temp file folder for downloading files
self.temp_folder_path = None

# Authentication Settings
# dict to store API key(s)
self.api_key = {}
# dict to store API prefix (e.g. Bearer)
self.api_key_prefix = {}
# Username for HTTP basic authentication
self.username = "admin"
# Password for HTTP basic authentication
self.password = "password"

####################################################

# Basic example using the client
exampleApi = killbill.api.ExampleApi()
body = Example(name='John', last_name = 'Doe')
created_by = 'me'
api_key = 'bob'
api_secret = 'lazar'

exampleApi.create(body,
                  created_by,
                  api_key,
                  api_secret)
```

## Resource IDs and External Keys

When a new resource is created, there are 2 IDS associated with it. Kill Bill will allocate a unique ID, and the user of the API will also be able to associate its own unique key, called the `external key`. The external key is used for 2 scenarios:

* **ID Mapping**: Typically an external key can be passed to create a mapping between the ID generated by Kill Bill and a known key for this resource
* **Idempotency**: Kill Bill ensures that each external key is unique, so if an API call times out, it can be safely retried with the same external key. The second request would only succeed if the first one did not complete. This ensures idempotency of the call, since the external key is unique per tenant and across all resources.


## Pagination

Besides the traditional CRUD APIs associated with each resource, we also offer pagination APIs to allow the listing of per-tenant resources, such as all `Account`s for a given tenant. These APIs include an `offset` and a `limit`, provided as query parameters, to allow the listing of all resources of a given type, on a page by page basis. In addition to the json list, each response will also include the following http headers:


* **`X-Killbill-Pagination-CurrentOffset`** : The offest of the first record in the returned list
* **`X-Killbill-Pagination-NextOffset`** : The header will only be present if there are additional entries to return and would include the next offset
* **`X-Killbill-Pagination-TotalNbRecords`** : The total number of records
* **`X-Killbill-Pagination-NextPageUri`** : The uri that can be used to retrieve the next page.


## Audit and History

Every api in Kill Bill that creates, or modifies state will create an audit log record to track *who* made the change. In addition, we also allow the record to specify *why* this change was made. This information is passed for every `POST`, `PUT`, and `DELETE` request and relies on special HTTP headers:

* **`X-Killbill-CreatedBy`** : Mandatory header to track who made the change.
* **`X-Killbill-Reason`** : Optional header to track the reason; typically one would use a special reason code -- e.g *COURTESY_REFUND*.
* **`X-Killbill-Comment`** : Optional header to track the metadata; typically one would add more information -- e.g 'Good old faithful customer'.

In addition to the audit log, Kill Bill also records the history of the changes. For instance updating the billing addess of a customer would create an additonal row to track the change and link it to the audit log. The `audit` query parameter can take the following values:

* **`NONE`** *[Default]*: No audit log is beeing returned. 
* **`MINIMAL`** : Only rows associated to *inserts* are being returned, but no `updates`.
* **`FULL`** : Everything is being returned.  

> Request: Fetching an account specifying `audit=MINIMAL`

```shell
curl \
-u admin:password \
-H "X-Killbill-ApiKey: bob" \
-H "X-Killbill-ApiSecret: lazar" \
-H "Content-Type: application/json" \
-H "X-Killbill-CreatedBy: demo" \
"http://127.0.0.1:8080/1.0/kb/accounts/e8877928-0226-488d-9272-07a5e66d897f?audit=MINIMAL"
```

```java
Account result = accountApi.getAccount(accountId,
                                      false,
                                      false,
                                      AuditLevel.MINIMAL,
                                      requestOptions);
```

```ruby
TODO  Api does not exist ;-(

```

> Response:

```
{
  ...
  "auditLogs": [
    {
      "changeType": "INSERT",
      "changeDate": "2018-02-05T22:39:53.000Z",
      "changedBy": "demo",
      "reasonCode": null,
      "comments": null,
      "userToken": "4858a67e-03b0-4d94-8a8c-bcd6e8599452"
    }
  ]
}  
```

Every API that retrieves information, whether associated with a specific resource, or with a list of resources,  may return audit logs.

Audit and history information associated with a given resource is always stored atomically to ensure that if the state is changed, such audit and history information exists and is accurate.

## Versioning


### Kill Bill Server

Kill Bill software is composed of many different repositories, all of them hosted on our [github account](https://github.com/killbill).

The Kill Bill server version, or simply Kill Bill version, is the one from the [killbill](https://github.com/killbill/killbill) repository, and more specifically since we are using `maven` to build, this is indicated in the corresponding `pom.xml`. This repository depends on a few others, each having their own versions:

* `killbill-api`: APIs used by plugins to communicate with Kill Bill core
* `killbill-plugin-api`: APIs used by Kill Bill core to communicate with plugins
* `killbill-commons`: Common code across modules
* `killbill-platform`: Platform related code such as OSGI framework, webapp pieces
* `killbill-client`: Java client, only used for integration tests inside killbill repository.

The version for all these dependencies is managed in the parent [pom.xml](https://github.com/killbill/killbill-oss-parent/blob/master/pom.xml). So in particular, for a given Kill Bill version, you can look up the version of the parent `pom.xml` and from there access all the dependencies.

The current **stable** and **production** ready version of Kill Bill is `0.24.y`. You should use the latest released (`y`) version as it may contain critical bug fixes.

* Any bug fixes will result in a new version identified by incrementing the `patch` number (`y`). We guarantee compatibility of these versions with those immediately preceding them. Each version will be accompanied by release notes on github - e.g [0.22.8 release notes](https://github.com/killbill/killbill/releases/tag/killbill-0.22.8).
* New development may happen in parallel. This may lead to the release of development versions. Such versions are not yet deemed stable, and will not be supported on the public mailing list.

The choice of releasing `0.x.y` and not `1.x.y` is motivated by our desire to add additional features in upcoming releases, and is in no way a statement about code instability.

### Client Libraries

Our client libraries contain a `README` section to describe their compatibility with the Kill Bill server. For instance, such compatibility mapping can be seen in our java client [here](https://github.com/killbill/killbill-client-java/blob/master/README.md#kill-bill-compatibility).


### Plugins

Each plugin also has its own version, and we also keep a `README` with the mapping section. For example, such a section for the adyen payment plugin can be found [here](https://github.com/killbill/killbill-adyen-plugin/blob/master/README.md#kill-bill-compatibility).

We also keep a global repository for all plugins [here](https://github.com/killbill/killbill-cloud/blob/master/kpm/lib/kpm/plugins_directory.yml). The simple file-based approach is an internal implementation. This brings us to our next topic, `KPM`.




### KPM

`KPM`, The Kill Bill Package Manager, provides among [other things](https://github.com/killbill/killbill-cloud/tree/master/kpm) the ability to retrieve version mapping for dependencies and plugins -- see the example on the right side.

> 

```

# Look up version dependencies matching Kill Bill release 0.22.8:
> kpm info  --version=0.22.8

Fetching info for version 0.22.8...
Dependencies for version 0.22.8
  killbill 0.22.8
  killbill-oss-parent 0.143.60
  killbill-api 0.53.17
  killbill-plugin-api 0.26.4
  killbill-commons 0.23.11
  killbill-platform 0.39.15

Known plugins for KB version 0.22.8
  analytics 7.0.8
  avatax 0.7.0
  email-notifications 0.6.1
  payment-test 7.0.4
  stripe 7.0.4
  ...

```


## Errors


Kill Bill relies on HTTP response codes to indicate the success or failure of an API request:

* **`2xx`** status indicates success
* **`4xx`** status often indicates a client side error -- e.g missing madatory API field
* **`5xx`** status indicates an error with Kill Bill's servers or third party system -- e.g payment gateway returns 5xx.

>

```
HTTP status code summary:
200 - OK: A response body may be returned.
201 - Created: Success in creating a new resource. A Location header is returned to indicate the uri that can be used to fetch the resource
202 - Accepted: The request has been accepted and will be processed asynchronously.
204 - No Content: The request was processed sucesfully but no response body is returned.
400 - Bad Request: Invalid/missing parameter from client.
401 - Unauthorized: Authorization failed.
402 - Request Failed: Request parameter were valid but request failed -- insufficient fund on a payment request.
404 - Not Found: The requested resource does not exist.
409 - Conflict:	The request conflicts with another request.
422 - Unprocessable Entity: Payment control plugin aborted the call.
500 - Unexpected system error.
502 - Bad Gateway : Unknow failure from payment plugin (PLUGIN_FAILURE).
503 - Service Unavailable: Kill Bill or a third party system -- e.g payment gateway -- is unavailable.
504 - Gateway Timeout: Payment gateway timed out.
```

In addition to these error codes, the system will often return some json to provide more details about the error:

* **`code`** : Each error in Kill Bill is associated with a an [ErrorCode](https://github.com/killbill/killbill-api/blob/master/src/main/java/org/killbill/billing/ErrorCode.java#L21).
* **`formattedMsg`** : A description of the error for the specific resource(s).
* **`cause`** : An optional stack trace.


## Additional Resources

Our main documentation is found [here](http://docs.killbill.io).

