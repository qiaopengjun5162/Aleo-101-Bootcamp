export enum PIICategory {
  EMAIL = 1,
  PHONE = 2,
  ADDRESS = 3,
  NAME = 4,
  CUSTOM = 99,
}

export enum PIIPurpose {
  ORDER_DELIVERY = 1,
  ACCOUNT_VERIFICATION = 2,
  BILLING = 3,
  COMMUNICATION = 4,
  LEGAL_COMPLIANCE = 5,
  CUSTOM = 99,
}

export interface PIIShareRequest {
  version: "1.0";
  category: PIICategory;
  purpose: PIIPurpose;
  requester_address: string;
  expires_in_blocks: number;
  display_name: string;
  display_purpose: string;
  privacy_policy_url?: string;
  requester_signature?: string;
}

export interface PIIShareResponse {
  status: "success";
  transaction_id: string;
  shared_record_commitment: string;
  expires_at_block: number;
  payload_hash: string;
}

export interface PIIShareError {
  status: "error";
  code: PIIShareErrorCode;
  message: string;
}

export enum PIIShareErrorCode {
  USER_REJECTED = 1001,
  WALLET_NOT_CONNECTED = 1002,
  RECORD_NOT_FOUND = 1003,
  NETWORK_MISMATCH = 1004,
  INVALID_REQUESTER = 1005,
  EXPIRED_REQUEST = 1006,
  TRANSITION_FAILED = 1007,
  INSUFFICIENT_CREDITS = 1008,
}
