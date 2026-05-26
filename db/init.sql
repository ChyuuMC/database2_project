CREATE DATABASE IF NOT EXISTS OrderProcessingDB;
USE OrderProcessingDB;

-- Create Customer Table
CREATE TABLE IF NOT EXISTS Customer (
 CustomerID INT PRIMARY KEY,
 CustomerName VARCHAR(100) NOT NULL,
 Email VARCHAR(100), 
 Address VARCHAR(255),
 City VARCHAR(50),
 Postcode VARCHAR(20),
 Country VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Shipper Table
CREATE TABLE IF NOT EXISTS Shipper (
 ShipperID INT PRIMARY KEY,
 ShipperName VARCHAR(100) NOT NULL,
 Phone VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Employee Table
CREATE TABLE IF NOT EXISTS Employee (
 EmployeeID INT PRIMARY KEY,
 FirstName VARCHAR(50), 
 LastName VARCHAR(50),
 Department VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Products Table
CREATE TABLE IF NOT EXISTS Products (
 ProductID INT PRIMARY KEY,
 ProductName VARCHAR(100) NOT NULL,
 Price DECIMAL(10, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Order Table
CREATE TABLE IF NOT EXISTS `Order` (
 OrderID INT PRIMARY KEY,
 OrderDate DATE NOT NULL,
 TotalAmount DECIMAL(10, 2),
 CustomerID INT,
 ShipperID INT,
 EmployeeID INT,
 ProductID INT, -- Linking directly to Products for 1:N requirement
 CONSTRAINT FK_Customer FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE SET NULL,
 CONSTRAINT FK_Shipper FOREIGN KEY (ShipperID) REFERENCES Shipper(ShipperID) ON DELETE SET NULL,
 CONSTRAINT FK_Employee FOREIGN KEY (EmployeeID) REFERENCES Employee(EmployeeID) ON DELETE SET NULL,
 CONSTRAINT FK_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Customer Data
INSERT INTO Customer (CustomerID, CustomerName, Email, Address, City, Postcode, Country) VALUES
(1, 'Alice Smith', 'alice@email.com', '123 Maple St', 'New York', '10001', 'USA'), 
(2, 'Bob Jones', 'bob@email.com', '456 Oak Ave', 'London', 'W1D', 'UK'), 
(3, 'Charlie Brown', 'charlie@email.com', '789 Pine Rd', 'Paris', '75001', 'France'), 
(4, 'Diana Prince', 'diana@email.com', '101 Elm St', 'Berlin', '10115', 'Germany'), 
(5, 'Evan Wright', 'evan@email.com', '202 Cedar Ln', 'Toronto', 'M5V', 'Canada'), 
(6, 'Fiona Green', 'fiona@email.com', '303 Birch Blvd', 'Sydney', '2000', 'Australia'), 
(7, 'George Hall', 'george@email.com', '404 Spruce Way', 'Tokyo', '100-00', 'Japan'), 
(8, 'Hannah Lee', 'hannah@email.com', '505 Fir Dr', 'Seoul', '045', 'South Korea'), 
(9, 'Ian Scott', 'ian@email.com', '606 Ash Ct', 'Dublin', 'D01', 'Ireland'), 
(10, 'Jane Doe', 'jane@email.com', '707 Willow Pl', 'Rome', '00100', 'Italy'), 
(11, 'Kyle Reese', 'kyle@email.com', '808 Aspen St', 'Madrid', '28001', 'Spain'), 
(12, 'Laura Croft', 'laura@email.com', '909 Poplar Ln', 'Lisbon', '1000', 'Portugal'), 
(13, 'Mike Ross', 'mike@email.com', '111 Redwood Dr', 'New York', '10002', 'USA'), 
(14, 'Nancy Drew', 'nancy@email.com', '222 Cypress Rd', 'Chicago', '60601', 'USA'), 
(15, 'Oscar Wilde', 'oscar@email.com', '333 Magnolia St', 'Dublin', 'D02', 'Ireland'), 
(16, 'Paul Rudd', 'paul@email.com', '444 Palm Ave', 'London', 'SW1', 'UK'), 
(17, 'Quinn Fabray', 'quinn@email.com', '555 Olive Way', 'Paris', '75002', 'France'), 
(18, 'Rachel Green', 'rachel@email.com', '666 Cherry Ln', 'New York', '10003', 'USA'), 
(19, 'Steve Rogers', 'steve@email.com', '777 Walnut St', 'Brooklyn', '11201', 'USA'), 
(20, 'Tony Stark', 'tony@email.com', '888 Malibu Pt', 'Malibu', '90265', 'USA')
ON DUPLICATE KEY UPDATE CustomerName=VALUES(CustomerName);

-- Insert Employee Data
INSERT INTO Employee (EmployeeID, FirstName, LastName, Department) VALUES
(101, 'John', 'Doe', 'Sales'), 
(102, 'Jane', 'Smith', 'IT'), 
(103, 'Michael', 'Johnson', 'Sales'), 
(104, 'Emily', 'Davis', 'HR'), 
(105, 'Chris', 'Brown', 'IT'), 
(106, 'Sarah', 'Wilson', 'Marketing'), 
(107, 'David', 'Taylor', 'Sales'), 
(108, 'Laura', 'Moore', 'Finance'), 
(109, 'Robert', 'Anderson', 'IT'), 
(110, 'Jennifer', 'Thomas', 'HR'), 
(111, 'William', 'Jackson', 'Sales'), 
(112, 'Elizabeth', 'White', 'Marketing'), 
(113, 'James', 'Harris', 'Finance'), 
(114, 'Patricia', 'Martin', 'IT'), 
(115, 'Linda', 'Thompson', 'Sales'), 
(116, 'Barbara', 'Garcia', 'HR'), 
(117, 'Richard', 'Martinez', 'Marketing'), 
(118, 'Susan', 'Robinson', 'Finance'), 
(119, 'Joseph', 'Clark', 'IT'), 
(120, 'Thomas', 'Rodriguez', 'Sales')
ON DUPLICATE KEY UPDATE FirstName=VALUES(FirstName);

-- Insert Shipper Data
INSERT INTO Shipper (ShipperID, ShipperName, Phone) VALUES
(1, 'Speedy Express', '555-1000'), 
(2, 'United Package', '555-1001'), 
(3, 'Federal Shipping', '555-1002'), 
(4, 'Global Freight', '555-1003'), 
(5, 'Quick Ship', '555-1004'), 
(6, 'Prime Delivery', '555-1005'), 
(7, 'Fast Track', '555-1006'), 
(8, 'Secure Move', '555-1007'), 
(9, 'Direct Cargo', '555-1008'), 
(10, 'Air Ways', '555-1009'), 
(11, 'Sea Transport', '555-1010'), 
(12, 'Road Runners', '555-1011'), 
(13, 'City Couriers', '555-1012'), 
(14, 'Nationwide', '555-1013'), 
(15, 'World Wide', '555-1014'), 
(16, 'Eco Ship', '555-1015'), 
(17, 'Night Owl', '555-1016'), 
(18, 'Day Break', '555-1017'), 
(19, 'Northern Star', '555-1018'), 
(20, 'Southern Cross', '555-1019')
ON DUPLICATE KEY UPDATE ShipperName=VALUES(ShipperName);

-- Insert Product Data
INSERT INTO Products (ProductID, ProductName, Price) VALUES
(1, 'Laptop', 1200.00), 
(2, 'Mouse', 25.00), 
(3, 'Keyboard', 45.00), 
(4, 'Monitor', 300.00), 
(5, 'Chair', 150.00), 
(6, 'Desk', 250.00), 
(7, 'Lamp', 40.00), 
(8, 'Pen', 1.50), 
(9, 'Notebook', 3.00), 
(10, 'Stapler', 5.00), 
(11, 'Phone', 800.00), 
(12, 'Tablet', 600.00), 
(13, 'Charger', 20.00), 
(14, 'Headphones', 100.00), 
(15, 'Sofa', 800.00), 
(16, 'Table', 400.00), 
(17, 'Book', 15.00), 
(18, 'Magazine', 8.00), 
(19, 'Bag', 50.00), 
(20, 'Watch', 150.00)
ON DUPLICATE KEY UPDATE ProductName=VALUES(ProductName);

-- Insert Order Data
INSERT INTO `Order` (OrderID, OrderDate, TotalAmount, CustomerID, ShipperID, EmployeeID, ProductID) VALUES
(1001, '2023-01-10', 1200.00, 1, 1, 101, 1), 
(1002, '2023-01-11', 25.00, 2, 2, 102, 2),
(1003, '2023-01-12', 45.00, 1, 1, 103, 3), 
(1004, '2023-01-13', 300.00, 3, 3, 104, 4), 
(1005, '2023-01-14', 150.00, 5, 2, 105, 5), 
(1006, '2023-01-15', 1200.00, 4, 1, 101, 1), 
(1007, '2023-01-16', 5.00, 2, 4, 106, 10), 
(1008, '2023-01-17', 800.00, 6, 2, 107, 11), 
(1009, '2023-01-18', 600.00, 8, 3, 108, 12), 
(1010, '2023-01-19', 40.00, 7, 1, 109, 7), 
(1011, '2023-01-20', 1.50, 1, 5, 110, 8), 
(1012, '2023-01-21', 25.00, 9, 2, 111, 2), 
(1013, '2023-01-22', 800.00, 10, 3, 112, 15), 
(1014, '2023-01-23', 400.00, 11, 1, 113, 16), 
(1015, '2023-01-24', 20.00, 12, 4, 114, 13), 
(1016, '2023-01-25', 100.00, 13, 2, 115, 14), 
(1017, '2023-01-26', 3.00, 14, 1, 116, 9), 
(1018, '2023-01-27', 15.00, 15, 3, 117, 17), 
(1019, '2023-01-28', 50.00, 16, 2, 118, 19), 
(1020, '2023-01-29', 150.00, 17, 5, 119, 20)
ON DUPLICATE KEY UPDATE TotalAmount=VALUES(TotalAmount);
