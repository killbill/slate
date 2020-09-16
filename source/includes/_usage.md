# Usage

When invoicing usage-based subscriptions, you need to record usage data into Kill Bill. Note that Kill Bill is not designed to be a metering system, so it shouldn't contain all data points. Instead, it expects that you record a usage summary on a daily basis (1 API call per subscription per day). For a telco company, for instance, instead of recording all phone calls, you should only record the number of minutes effectively used for each day.

For more information, see our [catalog usage documentation](http://docs.killbill.io/latest/userguide_subscription.html#components-catalog-usage) and our [invoice usage documentation](http://docs.killbill.io/latest/userguide_subscription.html#components-invoicing-usage).

## Usage Resource

There are several resource objects associated with usage in Kill-Bill. These include:

**SubscriptionUsageRecord**:

| Name | Type | Generated by | Description |
| ---- | -----| -------- | ------------ |
| **subscriptionId** | string | system | UUID for the subscription |
| **trackingId** | string | user | User's tracking Id for this usage record |
| **unitUsageRecords** | list | user | List of **UnitUsageRecord** (see next) |

**UnitUsageRecord**:

| Name | Type | Generated by | Description |
| ---- | -----| -------- | ------------ |
| **unitType** | string | user | Type of unit represented |
| **usageRecords** | list | user | List of **UsageRecord** for this unit (see next) |

**UsageRecord**:

| Name | Type | Generated by | Description |
| ---- | -----| -------- | ------------ |
| **recordDate** | string | user | Date for this record |
| **amount ** | integer | user | Amount of usage for this record |

**RolledUpUsage**:

| Name | Type | Generated by | Description |
| ---- | -----| -------- | ------------ |
| **subscriptionId** | string | system | UUID for the subscription |
| **startDate** | string | system | starting date for this record |
| **endDate** | string | system | ending date for this record |
| **rolledUpUnits** | list | system | List of **RolledUpUnit** (see next) |

**RolledUpUnit**:

| Name | Type | Generated by | Description |
| ---- | -----| -------- | ------------ |
| **unitType** | string | system | type of unit represented |
| **amount** | integer | system | total amount of usage of this unit |


## Usage

The APIs in this group support recording and retrieving usage data points.


### Record usage for a subscription

Records the daily mount of usage of a specified set of unit types for a given subscription

**HTTP Request**

`POST http://127.0.0.1:8080/1.0/kb/usages`

> Example Request:

```shell
curl -v \
    -X POST \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "X-Killbill-CreatedBy: demo" \
    -H "X-Killbill-Reason: demo" \
    -H "X-Killbill-Comment: demo" \
     -d '{"subscriptionId":"365987b2-5443-47e4-a467-c8962fc6995c","unitUsageRecords":[{"unitType":"chocolate-videos","usageRecords":[{"recordDate":"2013-03-14","amount":1}]}]}' \
    "http://localhost:8080/1.0/kb/usages"
```

```java
import org.killbill.billing.client.api.gen.UsageApi;
protected UsageApi usageApi;

UUID subscriptionId = UUID.fromString("365987b2-5443-47e4-a467-c8962fc6995c");

UsageRecord usageRecord1 = new UsageRecord();
usageRecord1.setAmount(1L);
usageRecord1.setRecordDate(new LocalDate("2013-03-14"));

UnitUsageRecord unitUsageRecord = new UnitUsageRecord();
unitUsageRecord.setUnitType("chocolate-videos");
unitUsageRecord.setUsageRecords(ImmutableList.<UsageRecord>of(usageRecord1));

SubscriptionUsageRecord usage = new SubscriptionUsageRecord();
usage.setSubscriptionId(subscriptionId);
usage.setUnitUsageRecords(ImmutableList.<UnitUsageRecord>of(unitUsageRecord));

usageApi.recordUsage(usage,
                     requestOptions);
```

```ruby
usage_record = KillBillClient::Model::UsageRecordAttributes.new
usage_record.amount = 1
usage_record.record_date = "2013-03-14"

unit_usage_record = KillBillClient::Model::UnitUsageRecordAttributes.new
unit_usage_record.unit_type = "chocolate-videos"
unit_usage_record.usage_records = []
unit_usage_record.usage_records << usage_record

result = KillBillClient::Model::UsageRecord.new
result.subscription_id = "365987b2-5443-47e4-a467-c8962fc6995c"
result.unit_usage_records = []
result.unit_usage_records << unit_usage_record

result.create(user, nil, nil, options)
```

```python
TODO
```

> Example Response:

```shell
# Subset of headers returned when specifying -v curl option
< HTTP/1.1 201
< Content-Type: application/json
< Content-Length: 0
```
```java
no content
```
```ruby
no content
```
```python
no content
```
**Request Body**

A SubscriptionUsageRecord.

**Query Parameters**

none

**Response**

If successful, returns a status code of 201 and an empty body.

### Retrieve usage for a subscription and unit type

Retrieves the usage record for a given subscription, for a specified period of time and a specified unit type

**HTTP Request**

`GET http://127.0.0.1:8080/1.0/kb/usages/{subscriptionId}/{unitType}`

> Example Request:

```shell
curl -v \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Accept: application/json" \
    "http://localhost:8080/1.0/kb/usages/365987b2-5443-47e4-a467-c8962fc6995c/chocolate-videos?startDate=2012-08-25&endDate=2013-08-26"
```

```java
import org.killbill.billing.client.api.gen.UsageApi;
protected UsageApi usageApi;

UUID subscriptionId = UUID.fromString("365987b2-5443-47e4-a467-c8962fc6995c");

String unitType = "chocolate-videos";
LocalDate startDate = new LocalDate("2012-08-25");
LocalDate endDate = new LocalDate("2013-08-26");

RolledUpUsage retrievedUsage = usageApi.getUsage(subscriptionId,
                                                 unitType,
                                                 startDate,
                                                 endDate,
                                                 requestOptions);
```

```ruby
subscription_id = "365987b2-5443-47e4-a467-c8962fc6995c"
start_date = "2012-08-25"
end_date_ = "2013-08-26"
unit_type = "chocolate-videos"

KillBillClient::Model::RolledUpUsage.find_by_subscription_id_and_type(subscription_id,
                                                                      start_date,
                                                                      end_date,
                                                                      unit_type,
                                                                      options)
```

```python
TODO
```

> Example Response:

```shell
{
  "subscriptionId": "365987b2-5443-47e4-a467-c8962fc6995c",
  "startDate": "2012-08-25",
  "endDate": "2013-08-26",
  "rolledUpUnits": [
    {
      "unitType": "chocolate-videos",
      "amount": 1
    }
  ]
}
```
```java
class RolledUpUsage {
    subscriptionId: 365987b2-5443-47e4-a467-c8962fc6995c
    startDate: 2012-08-25
    endDate: 2012-08-26
    rolledUpUnits: [class RolledUpUnit {
        unitType: chocolate-videos
        amount: 1
    }]
}
```
```ruby
{
  "subscriptionId": "365987b2-5443-47e4-a467-c8962fc6995c",
  "startDate": "2012-08-25",
  "endDate": "2013-08-26",
  "rolledUpUnits": [
    {
      "unitType": "chocolate-videos",
      "amount": 1
    }
  ]
}
```
```python
TODO
```

**Query Parameters**

| Name | Type | Required | Default | Description |
| ---- | -----| -------- | ------- | ----------- |
| **startDate** | date | yes | none | Date of oldest data point to retrieve (see below) |
| **endDate** | date | yes | none | Date of newest data point to retrieve (see below) |

* **startDate**, **endDate**: Data is retrieved beginning on the specified start date up to but not including the specified end date.

**Response**

IF successful, returns a status code of 200 and a RolledUpUsage object.


### Retrieve usage for a subscription

Retrieves the usage record for a given subscription, for a specified period of time and all unit types


**HTTP Request**

`GET http://127.0.0.1:8080/1.0/kb/usages/{subscriptionId}`

> Example Request:

```shell
curl -v \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Accept: application/json" \
    "http://localhost:8080/1.0/kb/usages/365987b2-5443-47e4-a467-c8962fc6995c?startDate=2012-08-25&endDate=2013-08-26"
```

```java
import org.killbill.billing.client.api.gen.UsageApi;
protected UsageApi usageApi;

UUID subscriptionId = UUID.fromString("365987b2-5443-47e4-a467-c8962fc6995c");

LocalDate startDate = new LocalDate("2012-08-25");
LocalDate endDate = new LocalDate("2013-08-26");

RolledUpUsage retrievedUsage = usageApi.getAllUsage(subscriptionId,
                                                    startDate,
                                                    endDate,
                                                    requestOptions);
```

```ruby
subscription_id = "365987b2-5443-47e4-a467-c8962fc6995c"
start_date = "2012-08-25"
end_date = = "2013-08-26"

KillBillClient::Model::RolledUpUsage.find_by_subscription_id(subscription_id,
                                                             start_date,
                                                             end_date,
                                                             options)
```

```python
TODO
```

> Example Response:

```shell
{
  "subscriptionId": "365987b2-5443-47e4-a467-c8962fc6995c",
  "startDate": "2012-08-25",
  "endDate": "2013-08-26",
  "rolledUpUnits": [
    {
      "unitType": "chocolate-videos",
      "amount": 1
    }
  ]
}
```
```java
class RolledUpUsage {
    subscriptionId: 365987b2-5443-47e4-a467-c8962fc6995c
    startDate: 2012-08-25
    endDate: 2012-08-26
    rolledUpUnits: [class RolledUpUnit {
        unitType: chocolate-videos
        amount: 1
    }]
}
```
```ruby
{
  "subscriptionId": "365987b2-5443-47e4-a467-c8962fc6995c",
  "startDate": "2012-08-25",
  "endDate": "2013-08-26",
  "rolledUpUnits": [
    {
      "unitType": "chocolate-videos",
      "amount": 1
    }
  ]
}
```
```python
TODO
```

**Query Parameters**

| Name | Type | Required | Default | Description |
| ---- | -----| -------- | ------- | ----------- |
| **startDate** | date | yes | none | Date of oldest data point to retrieve (see below) |
| **endDate** | date | yes | none | Date of newest data point to retrieve (see below) |

* **startDate**, **endDate**: Data is retrieved beginning on the specified start date up to but not including the specified end date.

**Response**

IF successful, returns a status code of 200 and a RolledUpUsage object.
