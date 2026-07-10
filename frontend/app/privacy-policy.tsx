import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
       <Text style={styles.body}>
Last Updated: 9 July 2026
</Text>

<Text style={styles.heading}>1. Introduction</Text>
<Text style={styles.body}>
Your News ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, and the choices available to you when using our application.
</Text>

<Text style={styles.heading}>2. Information We Collect</Text>
<Text style={styles.body}>
Depending on the features you use, we may collect:
{"\n\n"}• Device information required for app functionality.
{"\n"}• Information you voluntarily provide, such as your name, email address, or phone number.
{"\n"}• Phone numbers submitted for promotional campaigns or reward programs (if applicable).
</Text>

<Text style={styles.heading}>3. How We Use Your Information</Text>
<Text style={styles.body}>
We use your information to:
{"\n\n"}• Provide and improve our news services.
{"\n"}• Respond to your questions or support requests.
{"\n"}• Contact you regarding promotional campaigns or reward programs that you voluntarily participate in.
{"\n"}• Maintain the security and integrity of our services.
</Text>

<Text style={styles.heading}>4. Recharge Reward Campaigns</Text>
<Text style={styles.body}>
From time to time, we may organize promotional recharge reward campaigns. If you voluntarily submit your phone number to participate, your number will be used solely for administering that campaign, including selecting eligible participants and processing rewards where applicable.
</Text>

<Text style={styles.heading}>5. Data Sharing</Text>
<Text style={styles.body}>
We do not sell or rent your personal information. We may share information only when required by law or when necessary to operate and improve our services through trusted service providers.
</Text>

<Text style={styles.heading}>6. Data Security</Text>
<Text style={styles.body}>
We take reasonable administrative and technical measures to protect your information from unauthorized access, disclosure, or misuse. However, no method of electronic storage or transmission over the internet is completely secure.
</Text>

<Text style={styles.heading}>7. Third-Party Services</Text>
<Text style={styles.body}>
Our application may use trusted third-party services such as analytics, crash reporting, notifications, or cloud hosting. These services may process limited information necessary to provide their functionality in accordance with their own privacy policies.
</Text>

<Text style={styles.heading}>8. Children's Privacy</Text>
<Text style={styles.body}>
Our application is not intended for children under the age of 13. We do not knowingly collect personal information from children.
</Text>

<Text style={styles.heading}>9. Changes to this Policy</Text>
<Text style={styles.body}>
We may update this Privacy Policy from time to time. Any changes will be published within the application and become effective immediately upon publication.
</Text>

<Text style={styles.heading}>10. Contact Us</Text>
<Text style={styles.body}>
If you have any questions regarding this Privacy Policy or your personal information, please contact us using the details provided on the Contact Us page within the application.
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
