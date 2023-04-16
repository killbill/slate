# Security

Kill Bill supports fine grained roles and permissions.

Please refer to our [RBAC manual](https://docs.killbill.io/latest/user_management.html) for more details.

## Users

### List user permissions

### Get user information

### Add a new user with roles

### Update a user password

### Get roles associated to a user

### Update roles associated to a user

### Invalidate an existing user

## Roles

### Retrieve a role definition

Retrieve an existing role definition.

**HTTP Request**

`GET http://127.0.0.1:8080/1.0/kb/security/roles/{role}`

> Example Request:

```shell
curl -v \
     -u admin:password \
     -H "X-Killbill-ApiKey: bob" \
     -H "X-Killbill-ApiSecret: lazar" \
     -H "Accept: application/json" \
     'http://127.0.0.1:8080/1.0/kb/security/roles/ROLE'
```

```java
```

```ruby
```

```python
```

> Example Response:

```json
{
  "role": "ROLE",
  "permissions": [
    "account:*",
    "invoice:trigger"
  ]
}
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and the role object with associated permissions.

### Add a role definition

Create a new role definition.

**HTTP Request**

`POST http://127.0.0.1:8080/1.0/kb/roles`

> Example Request:

```shell
curl -v \
     -X POST \
     -u admin:password \
     -H "X-Killbill-ApiKey: bob" \
     -H "X-Killbill-ApiSecret: lazar" \
     -H "Content-Type: application/json" \
     -H "X-Killbill-CreatedBy: demo" \
     -d '{
             "role": "ROLE",
             "permissions": ["account:*","invoice:trigger"]
     }' \
     'http://127.0.0.1:8080/1.0/kb/security/roles'
```

```java
```

```ruby
```

```python
```

> Example Response:

```json
no content
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 201 and an empty body.

### Update a role definition

Update an existing role permissions.

**HTTP Request**

`PUT http://127.0.0.1:8080/1.0/kb/roles`

> Example Request:

```shell
curl -v \
     -X PUT \
     -u admin:password \
     -H "X-Killbill-ApiKey: bob" \
     -H "X-Killbill-ApiSecret: lazar" \
     -H "Content-Type: application/json" \
     -H "X-Killbill-CreatedBy: demo" \
     -d '{
             "role": "ROLE",
             "permissions": ["account:*"]
     }' \
     'http://127.0.0.1:8080/1.0/kb/security/roles'
```

```java
```

```ruby
```

```python
```

> Example Response:

```json
no content
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 204 and an empty body.
