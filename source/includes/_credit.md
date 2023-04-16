# Credit

## Credit Resource

The `Credit` resource represents the credits created on behalf of the customer `Account`. Credits are tracked inside invoices, as a specical kind of
invoice item. The credits are visible at the level of the `Account`, i.e account credit, and those will automatically be consumed by the system on
subsequent invoices to bring the balance to zero -- or reduce the balance if there is not enough credit to pay the full amount.

See section [Invoice Resource](#invoice) for the description of the `InvoiceItem` attributes.


## Credit

Basic endpoints to create and retrieve credit invoice items

### Create credits

Create one or more credits for a specified account. These credits will appear as `invoiceItem`s. They may be added to an existing DRAFT invoice, or they may result in the creation of a new invoice. While adding a credit to an existing invoice, specifying fields like `linkedInvoiceItemId`, `subscriptionId` has no effect. These fields do not get saved in the database and will not be returned in subsequent `GET` requests

**HTTP Request** 

`POST http://127.0.0.1:8080/1.0/kb/credits`

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
    -d '[{"amount": 50.0, "currency": "USD", "accountId": "1f979085-1765-471b-878a-5f640db4d831", "description": "example"}]' \
    "http://localhost:8080/1.0/kb/credits?autoCommit=true"
```

```java
import org.killbill.billing.client.api.gen.CreditApi;
protected CreditApi creditApi;

UUID accountId = UUID.fromString("864c1418-e768-4cd5-a0db-67537144b685");

Credit credit = new InvoiceItem();
credit.setAccountId(accountId);
credit.setAmount(BigDecimal.ONE);
credit.setDescription("description");

Boolean autoCommit = true;
Map<String, String> pluginProperty = null;

final InvoiceItems credits = new InvoiceItems();
credits.add(credit);
InvoiceItems createdCredits = creditApi.createCredits(credits, false, NULL_PLUGIN_PROPERTIES, requestOptions);
```

```ruby
credit_item                 = KillBillClient::Model::Credit.new()
credit_item.account_id      = 'da3769a8-58c4-4dc0-b4e8-7b534e349624'
credit_item.amount          = 50.0
credit_item.currency        = 'USD'
credit_item.description     = 'description'

auto_commit = true

credit_item.create(auto_commit, 
                   user,
                   reason,
                   comment,
                   options)
```

```python
creditApi = killbill.api.CreditApi()
body = Credit(account_id=account_id, 
              amount=50.0, 
              currency='USD', 
              description='example')

creditApi.create_credits([body], created_by, api_key, api_secret)
```

> Example Response:

```json
[
  {
    "invoiceItemId": "2a7746a3-abad-42d9-9f54-fe50c0b18802",
    "invoiceId": "e3caf986-8909-4677-afd4-ba03deeae8f0",
    "linkedInvoiceItemId": null,
    "accountId": "1f979085-1765-471b-878a-5f640db4d831",
    "childAccountId": null,
    "bundleId": null,
    "subscriptionId": null,
    "productName": null,
    "planName": null,
    "phaseName": null,
    "usageName": null,
    "prettyProductName": null,
    "prettyPlanName": null,
    "prettyPhaseName": null,
    "prettyUsageName": null,
    "itemType": "CREDIT_ADJ",
    "description": "example",
    "startDate": "2020-01-17",
    "endDate": "2020-01-17",
    "amount": 50,
    "rate": null,
    "currency": "USD",
    "quantity": null,
    "itemDetails": null,
    "catalogEffectiveDate": null,
    "childItems": null,
    "auditLogs": []
  }
]
```


**Request Body**

A list of one or more invoiceItem objects. Each object requires at least the following attributes: accountId and amount. If an invoiceId is given, the item will be added to the specified invoice. This invoice must be in DRAFT status or an error will occur. 

**Query Parameters**

| Name | Type | Required | Default | Description |
| ---- | -----| -------- | ------- | ----------- |
| **autoCommit** | boolean | no | false | if true, the resulting invoice will be `COMMITTED`.|

**Returns**

If successful, returns a status code of 200 and a list of invoiceItem resource objects representing the credit(s).

### Retrieve a credit by id

Retrieve an invoiceItem representing a credit given the invoiceItemId.

**HTTP Request** 

`GET http://127.0.0.1:8080/1.0/kb/credits/{invoiceItemId}`

> Example Request:

```shell
curl -v \
    -u admin:password \
    -H "X-Killbill-ApiKey: bob" \
    -H "X-Killbill-ApiSecret: lazar" \
    -H "Accept: application/json" \
    "http://localhost:8080/1.0/kb/credits/c8bfa9d1-76e5-4a42-92d0-b106c0902c16"	
```

```java
import org.killbill.billing.client.api.gen.CreditApi;
protected CreditApi creditApi;

UUID creditId = UUID.fromString("d2edf4c0-9929-4e2f-b3a9-feb9bd9d60ba");

Credit result = creditApi.getCredit(creditId, requestOptions)
```

```ruby
credit_id = 'fd5669a8-68c1-8dl0-m4e8-8y535e349324'

KillBillClient::Model::Credit.find_by_id(credit_id , options)
```

```python
creditApi = killbill.api.CreditApi()
        
creditApi.get_credit(credit_id, api_key, api_secret)
```
> Example Response:

```json
{
  "invoiceItemId": "c8bfa9d1-76e5-4a42-92d0-b106c0902c16",
  "amount": 50,
  "currency": "USD",
  "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5",
  "invoiceNumber": "310",
  "effectiveDate": "2018-07-20",
  "accountId": "2ad52f53-85ae-408a-9879-32a7e59dd03d",
  "description": "example",
  "itemDetails": null,
  "auditLogs": []
}
```

**Query Parameters**

None.

**Returns**

If successful, returns a status code of 200 and an invoiceItem resource object with itemType CREDIT_ADJ representing a credit.
