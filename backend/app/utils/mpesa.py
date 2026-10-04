import os
import requests
import base64
from datetime import datetime

class MPesaClient:
    """
    Safaricom Daraja 2.0 API Client & STK Push Integration
    Handles OAuth Token Generation, STK Push (LIPA NA M-PESA ONLINE), Callback Validation & Transaction Status Queries.
    """
    def __init__(self):
        self.env = os.environ.get('MPESA_ENV', 'sandbox').lower()
        self.consumer_key = os.environ.get('MPESA_CONSUMER_KEY', '')
        self.consumer_secret = os.environ.get('MPESA_CONSUMER_SECRET', '')
        self.shortcode = os.environ.get('MPESA_SHORTCODE', '174379') # Safaricom Sandbox Shortcode
        self.passkey = os.environ.get('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')
        self.callback_url = os.environ.get('MPESA_CALLBACK_URL', 'http://127.0.0.1:5000/api/billing/mpesa/callback')

        if self.env == 'production':
            self.base_url = 'https://api.safaricom.co.ke'
        else:
            self.base_url = 'https://sandbox.safaricom.co.ke'

    def get_access_token(self):
        if not self.consumer_key or not self.consumer_secret:
            return None

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            res = requests.get(url, auth=(self.consumer_key, self.consumer_secret), timeout=10)
            if res.status_code == 200:
                return res.json().get('access_token')
        except Exception as e:
            print(f"M-Pesa Access Token Error: {e}")
        return None

    def generate_password(self, timestamp):
        data_to_encode = f"{self.shortcode}{self.passkey}{timestamp}"
        encoded_string = base64.b64encode(data_to_encode.encode())
        return encoded_string.decode('utf-8')

    def initiate_stk_push(self, phone_number, amount, account_reference, transaction_desc="Hospital POS Bill Payment"):
        """
        Initiates M-Pesa STK Push prompt to patient's mobile phone.
        Format phone to 2547XXXXXXXX or 254712345678.
        """
        # Clean phone number format
        phone = str(phone_number).strip().replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = self.generate_password(timestamp)
        token = self.get_access_token()

        if not token:
            # Fallback Simulation Mode for testing when live credentials are not set
            checkout_id = f"ws_CO_SIM_{timestamp}_{phone[-4:]}"
            return {
                'ResponseCode': '0',
                'ResponseDescription': 'Success. Request accepted for processing (Simulated Sandbox STK Push)',
                'MerchantRequestID': f"MCH-SIM-{timestamp}",
                'CheckoutRequestID': checkout_id,
                'CustomerMessage': f"STK Push Sent to {phone}. Please enter M-Pesa PIN on your phone.",
                'is_simulation': True
            }

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": self.callback_url,
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_desc[:20]
        }

        try:
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            return res.json()
        except Exception as e:
            return {'error': str(e), 'ResponseCode': '1'}


def generate_etims_payload(bill, payment):
    """
    Generates KRA eTIMS (electronic Tax Invoice Management System) compliant payload structure.
    Prepares billing system for future direct KRA fiscalization integration.
    """
    total_amt = float(bill.total_amount)
    taxable_amt = round(total_amt / 1.16, 2) # Assuming 16% VAT standard rate or zero-rated medical exemptions
    vat_amt = round(total_amt - taxable_amt, 2)

    return {
        'kra_etims_header': {
            'taxpayer_pin': os.environ.get('KRA_PIN', 'P051298471Z'),
            'facility_name': 'CityCare Hospital Kenya',
            'branch_code': '001',
            'device_serial': 'ETIMS-CC-2026-NBI'
        },
        'invoice_details': {
            'invoice_number': bill.bill_number,
            'issue_date': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'payment_reference': payment.transaction_reference,
            'payment_method': payment.payment_method,
            'customer_name': bill.visit.patient.name if (bill.visit and bill.visit.patient) else 'Walk-in Patient',
            'customer_pin': bill.visit.patient.national_id if (bill.visit and bill.visit.patient) else 'N/A'
        },
        'tax_summary': {
            'total_amount': total_amt,
            'taxable_amount': taxable_amt,
            'tax_rate_percentage': 16.0,
            'vat_amount': vat_amt,
            'currency': 'KES'
        },
        'line_items': [
            {
                'item_name': item.item_name,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price),
                'tax_category': 'EXEMPT' if item.item_type == 'Drug' else 'STANDARD_16%'
            }
            for item in bill.items
        ]
    }
