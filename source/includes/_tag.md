# Tag

A tag is a label that may be attached to almost any resource. There are two categories of tags: `System Tags` and `User Tags`.

Kill Bill provides a small set of predefined `System Tags` that affect the behavior of the system. For example, `AUTO_PAY_OFF` prevents the system from initiating automatic payment of an invoice. `System Tags` may be attached only to specific resource types, and most (including `AUTO_PAY_OFF`) apply only to `Accounts`.

The following **system** tags have been defined:

| Tag | tagDefinitionId | Object type | Description |
| --- | --------------- | ----------- | ----------- |
| `AUTO_PAY_OFF` | `00000000-0000-0000-0000-000000000001` | `ACCOUNT` | Suspends payments until removed. |
| `AUTO_INVOICING_OFF` | `00000000-0000-0000-0000-000000000002` | `ACCOUNT` | Suspends invoicing until removed. |
| `OVERDUE_ENFORCEMENT_OFF` | `00000000-0000-0000-0000-000000000003` | `ACCOUNT` | Suspends overdue enforcement behaviour until removed. |
| `WRITTEN_OFF` | `00000000-0000-0000-0000-000000000004` | `INVOICE` | Indicates that an invoice is written off. This has no effect on billing or payment. |
| `MANUAL_PAY` | `00000000-0000-0000-0000-000000000005` | `ACCOUNT` | Indicates that Killbill doesn't process payments for this account. That is, the account uses external payments only. |
| `TEST` | `00000000-0000-0000-0000-000000000006` | `ACCOUNT` | Indicates that this is a test account. |
| `PARTNER` | `00000000-0000-0000-0000-000000000007` | `ACCOUNT` | Indicates that this is a partner account. |
| `AUTO_INVOICING_DRAFT` | `00000000-0000-0000-0000-000000000008` | `ACCOUNT` | Generate account invoices in DRAFT mode. |
| `AUTO_INVOICING_REUSE_DRAFT` | `00000000-0000-0000-0000-000000000009` | `ACCOUNT` | Use existing draft invoice if exists. |


`User Tags` are defined by the user for any desired purpose and are not interpreted by the system. `User Tags` must be defined using the `Tag Definition` APIs below. These tags may be attached to almost any resource type.

This section provides APIs to list all tags, search for a specific tag, and retrieve tag audit logs. In addition, each resource provides APIs for the applicable CRUD operations: creation, retrieval, and deletion. 

## Tag  Resource

A tag resource is associated with a tag definition and attached to another specific resource. The resource object has the following attributes:

| Name | Type | Generated by | Description |
| ---- | -----| -------- | ------------
| **tagId** | string | system | UUID for this specific tag |
| **objectType** | string | user | Type of the object this tag is attached to (e.g. "ACCOUNT")|
| **objectID** | string | system | UUID for the object |
| **tagDefinitionId** | string | system | UUID for the tag definition |
| **tagDefinitionName** | string | user | name for the tag definition |
| **auditLogs** | array | system | array of audit log records for this tag |

### List all tags

Retrieves a list of all tags with their associated resources and tag definitions

**HTTP Request**

`GET http://127.0.0.1:8080/1.0/kb/tags/pagination`

**Query Parameters**

| Name | Type | Required | Default | Description |
| ---- | -----| -------- | ---- | ------------
| **offset** | integer | false | 0 | starting item in the list |
| **limit** | integer | false | 100 | number of items to return |
| **audit** | string | false | "NONE" | "NONE", "MINIMAL", or "FULL" |

**Returns**
    
Returns a list of records for all tags

> Example Request:

```shell
curl  \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Accept: application/json" \
    "http://127.0.0.1:8080/1.0/kb/tags/pagination"

```
> Example Response:

```shell
# Subset of headers returned when specifying -v curl option
< HTTP/1.1 200 OK
< Content-Type: application/json

[
  {
    "tagId": "13fe6f2c-91af-4635-aa9c-52e04d99b5ec",
    "objectType": "ACCOUNT",
    "objectId": "212211f8-a264-4ddf-b609-709ae652aec4",
    "tagDefinitionId": "1ac0218e-0d2b-4c65-841f-cff8af92a100",
    "tagDefinitionName": "sleepy",
    "auditLogs": []
  }
]
```


### Search tags

Searches for a specific tag

**HTTP Request**

`GET http://127.0.0.1:8080/1.0/kb/tags/search/{tagId}`

**Query Parameters**

| Name | Type | Required | Default | Description |
| ---- | -----| -------- | ---- | ------------
| **offset** | integer | false | 0 | starting item in the list |
| **limit** | integer | false | 100 | number of items to return |
| **audit** | string | false | "NONE" | "NONE", "MINIMAL", or "FULL" |

**Returns**
    
Returns the record for the specified tag, if it exists



> Example Request:

```shell
curl  \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Accept: application/json" \
    "http://127.0.0.1:8080/1.0/kb/tags/search/13fe6f2c-91af-4635-aa9c-52e04d99b5ec"

```
> Example Response:

```shell
# Subset of headers returned when specifying -v curl option
< HTTP/1.1 200 OK
< Content-Type: application/json

[
  {
    "tagId": "13fe6f2c-91af-4635-aa9c-52e04d99b5ec",
    "objectType": "ACCOUNT",
    "objectId": "212211f8-a264-4ddf-b609-709ae652aec4",
    "tagDefinitionId": "1ac0218e-0d2b-4c65-841f-cff8af92a100",
    "tagDefinitionName": "sleepy",
    "auditLogs": []
  }
]
```



### Retrieve tag audit logs

Retrieves audit logs with history for a specific tag

**HTTP Request** 

`GET http://127.0.0.1:8080/1.0/kb/tags/{tagId}/auditLogsWithHistory`

**Query Parameters**

None.

**Returns**
    
Returns a list of tag audit logs with history.


> Example Request:

```shell
curl  \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Accept: application/json" \
    "http://127.0.0.1:8080/1.0/kb/tags/26e22dbf7-a493-4402-b1e3-4bec54c39f31/auditLogsWithHistory"

```
> Example Response:

```shell
# Subset of headers returned when specifying -v curl option
< HTTP/1.1 200 OK
< Content-Type: application/json

[
  {
    "changeType": "INSERT",
    "changeDate": "2013-09-01T06:00:05.000Z",
    "objectType": "TAG",
    "objectId": "6e22dbf7-a493-4402-b1e3-4bec54c39f31",
    "changedBy": "test_fixed_and_recurrring_items",
    "reasonCode": null,
    "comments": "Closing account",
    "userToken": "06d4fa80-f6ab-4760-aa97-2cd4ab83fd37",
    "history": {
      "id": null,
      "createdDate": "2013-09-01T06:00:05.000Z",
      "updatedDate": "2013-09-01T06:00:05.000Z",
      "recordId": 1,
      "accountRecordId": 11,
      "tenantRecordId": 2,
      "tagDefinitionId": "00000000-0000-0000-0000-000000000002",
      "objectId": "037a6b81-f351-4e09-b2ea-f76f2fb0189e",
      "objectType": "ACCOUNT",
      "isActive": true,
      "tableName": "TAG",
      "historyTableName": "TAG_HISTORY"
    }
  }
]

```
