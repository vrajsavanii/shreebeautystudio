// app/api/auth/addresses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-session-server';
import { upsertCustomerAccount } from '@/lib/customer-auth';
import { CustomerAddress } from '@/types/salon';
import { uid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      addresses: auth.customer.addresses || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { customer } = auth;
    const body = await req.json();
    const { name, mobile, line1, line2, city, state, pincode, country = 'India', type = 'Home', isDefault } = body;

    if (!line1 || !city || !pincode) {
      return NextResponse.json(
        { success: false, error: 'Address line 1, city, and pincode are required.' },
        { status: 400 }
      );
    }

    const addresses = [...(customer.addresses || [])];

    // If new address is default or it's the first address, clear other defaults
    const shouldBeDefault = isDefault || addresses.length === 0;
    if (shouldBeDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    const newAddress: CustomerAddress = {
      id: `addr_${uid()}`,
      name: (name || customer.name).trim(),
      mobile: (mobile || customer.mobile).trim(),
      line1: line1.trim(),
      line2: line2?.trim() || undefined,
      city: city.trim(),
      state: (state || 'Gujarat').trim(),
      pincode: pincode.trim(),
      country: country.trim(),
      type: type || 'Home',
      isDefault: shouldBeDefault,
    };

    addresses.push(newAddress);

    await upsertCustomerAccount({
      ...customer,
      addresses,
    });

    return NextResponse.json({
      success: true,
      message: 'Address added successfully!',
      addresses,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { customer } = auth;
    const body = await req.json();
    const { id, name, mobile, line1, line2, city, state, pincode, country, type, isDefault } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Address ID is required.' }, { status: 400 });
    }

    const addresses = [...(customer.addresses || [])];
    const idx = addresses.findIndex((a) => a.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Address not found.' }, { status: 404 });
    }

    if (isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    addresses[idx] = {
      ...addresses[idx],
      name: name !== undefined ? name.trim() : addresses[idx].name,
      mobile: mobile !== undefined ? mobile.trim() : addresses[idx].mobile,
      line1: line1 !== undefined ? line1.trim() : addresses[idx].line1,
      line2: line2 !== undefined ? line2.trim() : addresses[idx].line2,
      city: city !== undefined ? city.trim() : addresses[idx].city,
      state: state !== undefined ? state.trim() : addresses[idx].state,
      pincode: pincode !== undefined ? pincode.trim() : addresses[idx].pincode,
      country: country !== undefined ? country.trim() : addresses[idx].country,
      type: type !== undefined ? type : addresses[idx].type,
      isDefault: isDefault !== undefined ? isDefault : addresses[idx].isDefault,
    };

    await upsertCustomerAccount({
      ...customer,
      addresses,
    });

    return NextResponse.json({
      success: true,
      message: 'Address updated successfully!',
      addresses,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { customer } = auth;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Address ID is required.' }, { status: 400 });
    }

    let addresses = (customer.addresses || []).filter((a) => a.id !== id);

    // If deleted address was default and there are remaining addresses, make first default
    if (addresses.length > 0 && !addresses.some((a) => a.isDefault)) {
      addresses[0].isDefault = true;
    }

    await upsertCustomerAccount({
      ...customer,
      addresses,
    });

    return NextResponse.json({
      success: true,
      message: 'Address removed successfully.',
      addresses,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
