import os
import time
import datetime
import decimal
from flask import Flask, jsonify, request, send_from_directory
import psycopg2
import psycopg2.extras
from init_sql_data import INIT_SQL

app = Flask(__name__)

# --- DATABASE CONNECTION FUNCTION ---
def get_db_connection():
    # Check if a database URL connection string is provided (standard for Vercel/Neon Postgres)
    db_url = (
        os.environ.get('DATABASE_URL') or 
        os.environ.get('POSTGRES_URL') or 
        os.environ.get('POSTGRES_URL_NON_POOLING')
    )
    if db_url:
        return psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Fall back to individual variables, defaulting to local PostgreSQL settings
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', 'dbpassword'),
        database=os.environ.get('DB_NAME', 'OrderProcessingDB'),
        port=os.environ.get('DB_PORT', '5432'),
        cursor_factory=psycopg2.extras.RealDictCursor
    )

def wait_for_db():
    # Wait for the database container to start up and accept connections
    retries = 15
    while retries > 0:
        try:
            conn = get_db_connection()
            conn.close()
            print("Connected to PostgreSQL!", flush=True)
            return True
        except Exception as e:
            print(f"Waiting for database connection... ({e})", flush=True)
            time.sleep(2)
            retries -= 1
    return False

# --- HELPER FUNCTION FOR JSON SERIALIZATION ---
def serialize_db_data(data):
    # Converts PostgreSQL Date and Decimal formats to standard strings/floats so Flask can return JSON
    if isinstance(data, list):
        for row in data:
            for k, v in row.items():
                if isinstance(v, (datetime.date, datetime.datetime)):
                    row[k] = v.isoformat()
                elif isinstance(v, decimal.Decimal):
                    row[k] = float(v)
    elif isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (datetime.date, datetime.datetime)):
                data[k] = v.isoformat()
            elif isinstance(v, decimal.Decimal):
                data[k] = float(v)
# --- LAZY DATABASE SCHEMA INITIALIZATION ---
_db_initialized = False

def init_db_if_empty(conn):
    try:
        with conn.cursor() as cursor:
            # Check if Customer table exists in PostgreSQL
            cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer')")
            row = cursor.fetchone()
            if not row or not row['exists']:
                print("Database is empty. Initializing tables and seeding sample data...", flush=True)
                
                # Reconstruct queries from INIT_SQL string
                queries = []
                current_query = []
                for line in INIT_SQL.splitlines():
                    clean_line = line.strip()
                    if not clean_line or clean_line.startswith('--') or clean_line.startswith('#'):
                        continue
                    
                    current_query.append(line)
                    if clean_line.endswith(';'):
                        queries.append("".join(current_query))
                        current_query = []
                
                # Execute each SQL statement individually
                for query in queries:
                    query = query.strip()
                    if query:
                        cursor.execute(query)
                conn.commit()
                print("Database tables created and sample data seeded successfully!", flush=True)
    except Exception as e:
        print(f"Failed to auto-seed database: {e}", flush=True)

@app.before_request
def check_db_initialization():
    global _db_initialized
    if not _db_initialized:
        _db_initialized = True
        try:
            conn = get_db_connection()
            init_db_if_empty(conn)
            conn.close()
        except Exception as e:
            _db_initialized = False
            print(f"Lazy database initialization check failed: {e}", flush=True)

# --- ROUTING FOR FRONTEND ---
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# --- STATISTICS FOR DASHBOARD ---
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # SQL COUNT aggregate functions
            cursor.execute("SELECT COUNT(*) as total_orders FROM \"Order\"")
            total_orders = cursor.fetchone()['total_orders']
            
            # SQL SUM aggregate functions
            cursor.execute("SELECT SUM(TotalAmount) as total_revenue FROM \"Order\"")
            total_revenue = cursor.fetchone()['total_revenue'] or 0
            
            # SQL AVG aggregate functions
            cursor.execute("SELECT AVG(Price) as avg_price FROM Products")
            avg_price = cursor.fetchone()['avg_price'] or 0
            
            # Entity cardinalities
            cursor.execute("SELECT COUNT(*) as cnt FROM Customer")
            total_customers = cursor.fetchone()['cnt']
            
            cursor.execute("SELECT COUNT(*) as cnt FROM Products")
            total_products = cursor.fetchone()['cnt']
            
            cursor.execute("SELECT COUNT(*) as cnt FROM Employee")
            total_employees = cursor.fetchone()['cnt']
            
            cursor.execute("SELECT COUNT(*) as cnt FROM Shipper")
            total_shippers = cursor.fetchone()['cnt']
            
        conn.close()
        return jsonify({
            'total_orders': total_orders,
            'total_revenue': float(total_revenue),
            'avg_product_price': float(avg_price),
            'total_customers': total_customers,
            'total_products': total_products,
            'total_employees': total_employees,
            'total_shippers': total_shippers
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- CRUD FOR CUSTOMERS ---
@app.route('/api/customers', methods=['GET', 'POST'])
def manage_customers():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Customer")
                results = serialize_db_data(cursor.fetchall())
                return jsonify(results)
                
            elif request.method == 'POST':
                data = request.json
                # Auto-generate Primary Key
                if not data.get('CustomerID'):
                    cursor.execute("SELECT MAX(CustomerID) as max_id FROM Customer")
                    data['CustomerID'] = (cursor.fetchone()['max_id'] or 0) + 1
                
                sql = """INSERT INTO Customer (CustomerID, CustomerName, Email, Address, City, Postcode, Country) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s)"""
                cursor.execute(sql, (
                    data['CustomerID'], data['CustomerName'], data.get('Email'), 
                    data.get('Address'), data.get('City'), data.get('Postcode'), data.get('Country')
                ))
                conn.commit()
                return jsonify({'message': 'Customer added!', 'CustomerID': data['CustomerID']}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/customers/<int:id>', methods=['PUT', 'DELETE'])
def detail_customer(id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                sql = """UPDATE Customer SET CustomerName=%s, Email=%s, Address=%s, City=%s, Postcode=%s, Country=%s 
                         WHERE CustomerID=%s"""
                cursor.execute(sql, (
                    data['CustomerName'], data.get('Email'), data.get('Address'), 
                    data.get('City'), data.get('Postcode'), data.get('Country'), id
                ))
                conn.commit()
                return jsonify({'message': 'Customer updated!'})
                
            elif request.method == 'DELETE':
                cursor.execute("DELETE FROM Customer WHERE CustomerID=%s", (id,))
                conn.commit()
                return jsonify({'message': 'Customer deleted!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

# --- CRUD FOR PRODUCTS ---
@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Products")
                results = serialize_db_data(cursor.fetchall())
                return jsonify(results)
                
            elif request.method == 'POST':
                data = request.json
                if not data.get('ProductID'):
                    cursor.execute("SELECT MAX(ProductID) as max_id FROM Products")
                    data['ProductID'] = (cursor.fetchone()['max_id'] or 0) + 1
                
                sql = "INSERT INTO Products (ProductID, ProductName, Price) VALUES (%s, %s, %s)"
                cursor.execute(sql, (data['ProductID'], data['ProductName'], data['Price']))
                conn.commit()
                return jsonify({'message': 'Product added!', 'ProductID': data['ProductID']}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/products/<int:id>', methods=['PUT', 'DELETE'])
def detail_product(id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                sql = "UPDATE Products SET ProductName=%s, Price=%s WHERE ProductID=%s"
                cursor.execute(sql, (data['ProductName'], data['Price'], id))
                conn.commit()
                return jsonify({'message': 'Product updated!'})
                
            elif request.method == 'DELETE':
                cursor.execute("DELETE FROM Products WHERE ProductID=%s", (id,))
                conn.commit()
                return jsonify({'message': 'Product deleted!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

# --- CRUD FOR EMPLOYEES ---
@app.route('/api/employees', methods=['GET', 'POST'])
def manage_employees():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Employee")
                results = serialize_db_data(cursor.fetchall())
                return jsonify(results)
                
            elif request.method == 'POST':
                data = request.json
                if not data.get('EmployeeID'):
                    cursor.execute("SELECT MAX(EmployeeID) as max_id FROM Employee")
                    data['EmployeeID'] = (cursor.fetchone()['max_id'] or 0) + 1
                
                sql = "INSERT INTO Employee (EmployeeID, FirstName, LastName, Department) VALUES (%s, %s, %s, %s)"
                cursor.execute(sql, (data['EmployeeID'], data['FirstName'], data['LastName'], data.get('Department')))
                conn.commit()
                return jsonify({'message': 'Employee added!', 'EmployeeID': data['EmployeeID']}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/employees/<int:id>', methods=['PUT', 'DELETE'])
def detail_employee(id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                sql = "UPDATE Employee SET FirstName=%s, LastName=%s, Department=%s WHERE EmployeeID=%s"
                cursor.execute(sql, (data['FirstName'], data['LastName'], data.get('Department'), id))
                conn.commit()
                return jsonify({'message': 'Employee updated!'})
                
            elif request.method == 'DELETE':
                cursor.execute("DELETE FROM Employee WHERE EmployeeID=%s", (id,))
                conn.commit()
                return jsonify({'message': 'Employee deleted!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

# --- CRUD FOR SHIPPERS ---
@app.route('/api/shippers', methods=['GET', 'POST'])
def manage_shippers():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Shipper")
                results = serialize_db_data(cursor.fetchall())
                return jsonify(results)
                
            elif request.method == 'POST':
                data = request.json
                if not data.get('ShipperID'):
                    cursor.execute("SELECT MAX(ShipperID) as max_id FROM Shipper")
                    data['ShipperID'] = (cursor.fetchone()['max_id'] or 0) + 1
                
                sql = "INSERT INTO Shipper (ShipperID, ShipperName, Phone) VALUES (%s, %s, %s)"
                cursor.execute(sql, (data['ShipperID'], data['ShipperName'], data.get('Phone')))
                conn.commit()
                return jsonify({'message': 'Shipper added!', 'ShipperID': data['ShipperID']}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/shippers/<int:id>', methods=['PUT', 'DELETE'])
def detail_shipper(id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                sql = "UPDATE Shipper SET ShipperName=%s, Phone=%s WHERE ShipperID=%s"
                cursor.execute(sql, (data['ShipperName'], data.get('Phone'), id))
                conn.commit()
                return jsonify({'message': 'Shipper updated!'})
                
            elif request.method == 'DELETE':
                cursor.execute("DELETE FROM Shipper WHERE ShipperID=%s", (id,))
                conn.commit()
                return jsonify({'message': 'Shipper deleted!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

# --- CRUD FOR ORDERS ---
@app.route('/api/orders', methods=['GET', 'POST'])
def manage_orders():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                # SQL JOIN statements to resolve name details for display
                sql = """SELECT o.*, c.CustomerName, s.ShipperName, 
                                CONCAT(e.FirstName, ' ', e.LastName) as EmployeeName, p.ProductName
                         FROM "Order" o
                         LEFT JOIN Customer c ON o.CustomerID = c.CustomerID
                         LEFT JOIN Shipper s ON o.ShipperID = s.ShipperID
                         LEFT JOIN Employee e ON o.EmployeeID = e.EmployeeID
                         LEFT JOIN Products p ON o.ProductID = p.ProductID"""
                cursor.execute(sql)
                results = serialize_db_data(cursor.fetchall())
                return jsonify(results)
                
            elif request.method == 'POST':
                data = request.json
                if not data.get('OrderID'):
                    cursor.execute("SELECT MAX(OrderID) as max_id FROM \"Order\"")
                    data['OrderID'] = (cursor.fetchone()['max_id'] or 0) + 1
                
                # Fetch product price if TotalAmount is omitted
                if not data.get('TotalAmount') and data.get('ProductID'):
                    cursor.execute("SELECT Price FROM Products WHERE ProductID=%s", (data['ProductID'],))
                    res = cursor.fetchone()
                    if res:
                        data['TotalAmount'] = res['Price']
                
                sql = """INSERT INTO "Order" (OrderID, OrderDate, TotalAmount, CustomerID, ShipperID, EmployeeID, ProductID) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s)"""
                cursor.execute(sql, (
                    data['OrderID'], data['OrderDate'], data.get('TotalAmount', 0), 
                    data.get('CustomerID'), data.get('ShipperID'), data.get('EmployeeID'), data.get('ProductID')
                ))
                conn.commit()
                return jsonify({'message': 'Order added!', 'OrderID': data['OrderID']}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/orders/<int:id>', methods=['PUT', 'DELETE'])
def detail_order(id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == 'PUT':
                data = request.json
                sql = """UPDATE "Order" SET OrderDate=%s, TotalAmount=%s, CustomerID=%s, ShipperID=%s, EmployeeID=%s, ProductID=%s 
                         WHERE OrderID=%s"""
                cursor.execute(sql, (
                    data['OrderDate'], data['TotalAmount'], data.get('CustomerID'), 
                    data.get('ShipperID'), data.get('EmployeeID'), data.get('ProductID'), id
                ))
                conn.commit()
                return jsonify({'message': 'Order updated!'})
                
            elif request.method == 'DELETE':
                cursor.execute("DELETE FROM \"Order\" WHERE OrderID=%s", (id,))
                conn.commit()
                return jsonify({'message': 'Order deleted!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

if __name__ == '__main__':
    if 'VERCEL' not in os.environ:
        wait_for_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
else:
    if 'VERCEL' not in os.environ:
        wait_for_db()
