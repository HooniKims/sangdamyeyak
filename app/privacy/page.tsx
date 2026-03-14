import type { Metadata } from 'next';
import PrivacyPolicyContent from './PrivacyPolicyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy | 상담 예약 도우미',
  description: 'Privacy policy for the Counseling Booking Assistant service.',
};

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
}
