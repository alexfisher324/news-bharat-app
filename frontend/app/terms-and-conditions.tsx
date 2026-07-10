import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';

export default function TermsAndConditions() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
       <Text style={styles.body}>
Last Updated: 9 July 2026
</Text>

<Text style={styles.heading}>1. Acceptance of Terms</Text>
<Text style={styles.body}>
By downloading, accessing, or using The Bharat Evolution ("the App"), you agree to comply with these Terms & Conditions. If you do not agree with any part of these terms, please discontinue use of the App.
</Text>

<Text style={styles.heading}>2. Use of the App</Text>
<Text style={styles.body}>
The App provides news and informational content for general informational purposes only. Users agree to use the App responsibly and in accordance with applicable laws and regulations.
</Text>

<Text style={styles.heading}>3. Content</Text>
<Text style={styles.body}>
All news, articles, images, and other content published within the App are the property of The Bharat Evolution or are used with appropriate permissions. Users may not copy, reproduce, or redistribute content without prior written permission.
</Text>

<Text style={styles.heading}>4. User Conduct</Text>
<Text style={styles.body}>
Users must not misuse the App, attempt unauthorized access, distribute harmful software, or engage in activities that may interfere with the proper functioning of the service.
</Text>

<Text style={styles.heading}>5. Promotional Recharge Campaigns</Text>
<Text style={styles.body}>
From time to time, The Bharat Evolution may conduct voluntary promotional campaigns, including mobile recharge rewards.

{"\n\n"}• Participation in any promotional campaign is completely voluntary.
{"\n"}• Submission of a mobile number does not guarantee that a recharge or reward will be provided.
{"\n"}• Eligible participants may be selected based on the campaign rules announced at the time of the promotion.
{"\n"}• The value, number, frequency, eligibility criteria, and duration of any promotional campaign are determined solely by The Bharat Evolution and may change or end at any time without prior notice.
{"\n"}• Promotional rewards have no cash value and cannot be transferred or exchanged.
{"\n"}• Any attempt to abuse, manipulate, or fraudulently participate in a campaign may result in disqualification.
</Text>

<Text style={styles.heading}>6. Limitation of Liability</Text>
<Text style={styles.body}>
While we strive to provide accurate and timely information, we do not guarantee that all content is complete, accurate, or up to date. The Bharat Evolution shall not be liable for any direct or indirect damages arising from the use of the App.
</Text>

<Text style={styles.heading}>7. Changes to the Service</Text>
<Text style={styles.body}>
We reserve the right to modify, suspend, or discontinue any feature, content, or service within the App at any time without prior notice.
</Text>

<Text style={styles.heading}>8. Changes to These Terms</Text>
<Text style={styles.body}>
These Terms & Conditions may be updated periodically. Continued use of the App after changes are published constitutes acceptance of the revised Terms.
</Text>

<Text style={styles.heading}>9. Contact Us</Text>
<Text style={styles.body}>
For questions regarding these Terms & Conditions, please contact us using the information provided on the Contact Us page within the App.
</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1F2937',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 14,
  },
  heading: {
  fontSize: 18,
  fontWeight: "700",
  color: "#1F2937",
  marginTop: 22,
  marginBottom: 8,
},
});
