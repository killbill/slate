# Aviate Coupons

The [Aviate Coupons feature](https://docs.killbill.io/latest/aviate-coupons) provides endpoints that allow you to create and manage coupons. Coupons are reusable discounts that can be redeemed by customers during subscription creation or update. This section documents the APIs exposed by the Aviate Coupons feature.

## Before You Begin

### Authentication

The Aviate Plugin uses a JWT-based authentication mechanism. All the APIs listed in this document require a valid token, which can be obtained via the [Auth API](aviate-auth.html).

---

## Resources

This section lists the models used by the Aviate Coupon APIs.

### CouponInput

Represents the input payload for creating a new coupon.

| Name                 | Type       | Required | Description                                                                       |
|----------------------|-----------|----------|-----------------------------------------------------------------------------------|
| `redemptionCode`     | `string`  | yes      | Unique redemption code for the coupon                                            |
| `reusable`           | `boolean` | yes      | Whether the coupon can be reused multiple times by the same customer             |
| `maxUse`             | `integer` | yes      | Max number of times a coupon can be redeemed by customers                       |
| `discountType`       | `string`  | yes      | Discount type: `DISCOUNT_TYPE_FIXED` or `DISCOUNT_TYPE_PERCENTAGE`              |
| `discountPrice`      | `string`  | no       | Fixed discount amount (required if `discountType` = FIXED)                      |
| `discountCurrency`   | `string`  | no       | Currency for fixed discount (required if `discountType` = FIXED)                |
| `discountPercentage` | `number`  | no       | Percentage discount (required if `discountType` = PERCENTAGE)                   |
| `expirationDate`     | `string` (date-time) | no | Optional expiration date                                                         |
| `planList`           | `array` of `string` | no | Optional list of plan names where the coupon is applicable                      |

---

### Coupon

Represents a coupon that can be redeemed.


| Name                 | Type       | Description                                                           |
|----------------------|-----------|-----------------------------------------------------------------------|
| `redemptionCode`     | `string`  | Unique redemption code                                               |
| `reusable`           | `boolean` | Whether the coupon can be reused multiple times by the same customer|
| `maxUse`             | `integer` | Max number of times a coupon can be redeemed by customers           |
| `discountType`       | `string`  | Discount type                                                        |
| `discountPrice`      | `string`  | Fixed discount amount                                                |
| `discountCurrency`   | `string`  | Currency for fixed discount                                          |
| `discountPercentage` | `number`  | Percentage discount                                                  |
| `expirationDate`     | `string` (date-time) | Expiration date                                           |
| `planList`           | `array`   | Applicable plan names                                                |
| `createdDate`        | `string` (date-time) | Date when the coupon was created                               |
| `archived`           | `boolean` | Whether the coupon is archived                                      |

---

### CouponResponse

Represents the response returned after creating a coupon.

| Name            | Type                 | Description                                      |
|-----------------|----------------------|--------------------------------------------------|
| `coupon`        | [`Coupon`](#coupon) | Coupon object                                    |
| `status`        | `string`            | `SUCCESS` or `FAILED`                           |
| `errorMessage`  | `string`            | Error message when status = FAILED              |

---

## Coupon APIs

### Create a Coupon

Create a new coupon with the given attributes.

**HTTP Request**

`POST /plugins/aviate-plugin/v1/coupon`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'Content-Type: application/json' \
     -d '{
           "redemptionCode": "UPGRADE2025",
           "reusable": true,
           "maxUse": 100,
           "discountType": "DISCOUNT_TYPE_FIXED",
           "discountPrice": "10.00",
           "discountCurrency": "USD",
           "expirationDate": "2025-12-31T00:00:00Z",
           "planList": ["premium-monthly", "premium-annual"]
         }' \
     http://127.0.0.1:8080/plugins/aviate-plugin/v1/coupon
```


```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

Returns `201` with a `CouponResponse` object.

```json
{
  "coupon": {
    "redemptionCode": "UPGRADE2025",
    "reusable": true,
    "maxUse": 100,
    "discountType": "DISCOUNT_TYPE_FIXED",
    "discountPrice": "10.00",
    "discountCurrency": "USD",
    "expirationDate": "2025-12-31T00:00:00Z",
    "planList": ["premium-monthly", "premium-annual"],
    "createdDate": "2025-08-02T10:00:00Z",
    "archived": false
  },
  "status": "SUCCESS",
  "errorMessage": null
}
```


###  List Coupons

Retrieve all existing coupons, optionally including expired or archived coupons.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/coupon`

Query Parameters

| Name            | Type           | Required | Default      | Description    
|-----------------|----------------|----------|--------------|--------------------------|
| includeArchived	| boolean	| false	| false | Include archived coupons in the response
| includeExpired	| boolean	| false	| false | Include expired coupons in the response
---

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     http://127.0.0.1:8080/plugins/aviate-plugin/v1/coupon?includeArchived=false&includeExpired=true
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

Returns `200` with a list of `Coupon` objects.

```json     
[
  {
    "redemptionCode": "UPGRADE2025",
    "reusable": true,
    "maxUse": 100,
    "discountType": "DISCOUNT_TYPE_FIXED",
    "discountPrice": "10.00",
    "discountCurrency": "USD",
    "expirationDate": "2025-12-31T00:00:00Z",
    "planList": ["premium-monthly", "premium-annual"],
    "createdDate": "2025-08-02T10:00:00Z",
    "archived": false
  },
  {
    "redemptionCode": "BLACKFRIDAY",
    "reusable": false,
    "maxUse": 100,
    "discountType": "DISCOUNT_TYPE_PERCENTAGE",
    "discountPercentage": 20,
    "expirationDate": "2025-11-30T23:59:59Z",
    "planList": [],
    "createdDate": "2025-07-15T12:00:00Z",
    "archived": false
  }
]
```


###  Get Coupon by Redemption Code

Retrieve details of a specific coupon.

**HTTP Request**


`GET /plugins/aviate-plugin/v1/coupon/redemptionCode/{redemptionCode}`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     http://127.0.0.1:8080/plugins/aviate-plugin/v1/coupon/redemptionCode/UPGRADE2025
```


```java
```

```ruby
```

```python
```

```php
```

```javascript
```

> Example Response:

Returns `200` with a `Coupon` object.

```json
{
  "redemptionCode": "UPGRADE2025",
  "reusable": true,
  "maxUse": 100,
  "discountType": "DISCOUNT_TYPE_FIXED",
  "discountPrice": "10.00",
  "discountCurrency": "USD",
  "expirationDate": "2025-12-31T00:00:00Z",
  "planList": ["premium-monthly", "premium-annual"],
  "createdDate": "2025-08-02T10:00:00Z",
  "archived": false
}
```

### Archive a Coupon

Archive a coupon so that it can no longer be redeemed.

**HTTP Request**

`PUT /plugins/aviate-plugin/v1/coupon/{redemptionCode}/archive`

> Example Request:

```shell
curl -X PUT \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     http://127.0.0.1:8080/plugins/aviate-plugin/v1/coupon/UPGRADE2025/archive
```


```java
```

```ruby
```

```python
```

```php
```

```javascript
```

> Example Response:

```
HTTP/1.1 204 No Content
```

Returns `204` with an empty body on success.