import { test, expect } from "bun:test";
import {
  encodeAddress,
  decodeAddress,
  type AddressFields,
} from "./address";

const full: AddressFields = {
  country: "US",
  province: "California",
  city: "San Francisco",
  street: "1 Market St",
  lastName: "Doe",
  firstName: "Jane",
  phonePrefix: "+1",
  phone: "5551234567",
  email: "jane@example.com",
};

test("encodeAddress joins the 9 fields in fixed order with pipes", () => {
  expect(encodeAddress(full)).toBe(
    "US|California|San Francisco|1 Market St|Doe|Jane|+1|5551234567|jane@example.com",
  );
});

test("roundtrip preserves a full address", () => {
  expect(decodeAddress(encodeAddress(full))).toEqual(full);
});

test("roundtrip with empty optional phone and email", () => {
  const partial: AddressFields = {
    ...full,
    phonePrefix: "",
    phone: "",
    email: "",
  };
  const encoded = encodeAddress(partial);
  expect(encoded).toBe("US|California|San Francisco|1 Market St|Doe|Jane|||");
  expect(decodeAddress(encoded)).toEqual(partial);
});

test("encodeAddress trims surrounding whitespace per field", () => {
  expect(
    encodeAddress({ ...full, city: "  San Francisco  ", phone: " 555 " }),
  ).toBe(
    "US|California|San Francisco|1 Market St|Doe|Jane|+1|555|jane@example.com",
  );
});

test("encodeAddress strips embedded pipe characters from values", () => {
  expect(encodeAddress({ ...full, street: "a|b|c" })).toBe(
    "US|California|San Francisco|abc|Doe|Jane|+1|5551234567|jane@example.com",
  );
});

test("decodeAddress with fewer than 9 segments fills the rest with empty strings", () => {
  expect(decodeAddress("US|California|San Francisco")).toEqual({
    country: "US",
    province: "California",
    city: "San Francisco",
    street: "",
    lastName: "",
    firstName: "",
    phonePrefix: "",
    phone: "",
    email: "",
  });
});

test("decodeAddress of an empty string yields all empty fields", () => {
  expect(decodeAddress("")).toEqual({
    country: "",
    province: "",
    city: "",
    street: "",
    lastName: "",
    firstName: "",
    phonePrefix: "",
    phone: "",
    email: "",
  });
});

test("legacy pipe-free string puts everything in country (documented behavior)", () => {
  const legacy = "123 Main Street, Springfield";
  const decoded = decodeAddress(legacy);
  expect(decoded.country).toBe(legacy);
  expect(decoded.province).toBe("");
  expect(decoded.email).toBe("");
});

test("extra segments beyond 9 are ignored on decode", () => {
  const decoded = decodeAddress(
    "US|California|San Francisco|1 Market St|Doe|Jane|+1|5551234567|jane@example.com|extra",
  );
  expect(decoded).toEqual(full);
});
