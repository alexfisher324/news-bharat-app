import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router/build/exports';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
    TouchableOpacity,
} from 'react-native';

export default function RechargeTermsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Recharge Reward Program
        </Text>

        <Text style={styles.updated}>
          Last Updated: 9 July 2026
        </Text>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>
            Promotional Program
          </Text>

          <Text style={styles.noticeText}>
            The Recharge Reward Program is a promotional activity conducted by
            The Bharat Evolution. Participation is completely voluntary and
            free of charge.
          </Text>
        </View>

        <Text style={styles.heading}>
          1. Eligibility
        </Text>

        <Text style={styles.body}>
          Participation is open to users who voluntarily submit a valid mobile
          number through the application. Participants must provide accurate
          information.
        </Text>

        <Text style={styles.heading}>
          2. Participation
        </Text>

        <Text style={styles.body}>
          Users may participate by submitting their mobile number through the
          Recharge Reward section of the application.
        </Text>

        <Text style={styles.heading}>
          3. No Guaranteed Reward
        </Text>

        <Text style={styles.body}>
          Submission of a mobile number does not guarantee that a recharge,
          reward, or any other benefit will be provided.
        </Text>

        <Text style={styles.heading}>
          4. Selection of Participants
        </Text>

        <Text style={styles.body}>
          Eligible participants may be selected by The Bharat Evolution
          according to the promotional campaign rules and internal selection
          criteria.
        </Text>

        <Text style={styles.heading}>
          5. Recharge Value
        </Text>

        <Text style={styles.body}>
          Recharge values, the number of selected participants, campaign
          duration, and eligibility requirements are determined solely by The
          Bharat Evolution and may change without prior notice.
        </Text>

        <Text style={styles.heading}>
          6. Duplicate Entries
        </Text>

        <Text style={styles.body}>
          Duplicate, incorrect, fake, inactive, or fraudulent mobile numbers
          may be rejected without notice.
        </Text>

        <Text style={styles.heading}>
          7. User Responsibility
        </Text>

        <Text style={styles.body}>
          Participants must ensure that the submitted mobile number belongs to
          them or that they have obtained permission from the owner before
          submitting it.
        </Text>

        <Text style={styles.heading}>
          8. Promotional Nature
        </Text>

        <Text style={styles.body}>
          This program is intended solely as a promotional campaign. Rewards,
          if provided, have no cash value and cannot be exchanged,
          transferred, or redeemed for any other benefit.
        </Text>

        <Text style={styles.heading}>
          9. Privacy
        </Text>

        <Text style={styles.body}>
          Mobile numbers collected for this program will only be used for
          administering the Recharge Reward Program and related communication,
          in accordance with our Privacy Policy.
        </Text>

        <Text style={styles.heading}>
          10. Right to Modify
        </Text>

        <Text style={styles.body}>
          The Bharat Evolution reserves the right to modify, suspend,
          discontinue, or cancel this promotional program at any time without
          prior notice.
        </Text>

        <Text style={styles.heading}>
          11. Acceptance
        </Text>

        <Text style={styles.body}>
          By participating in the Recharge Reward Program, you acknowledge that
          you have read, understood, and agreed to these Terms & Conditions.
        </Text>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>
            Important Notice
          </Text>

          <Text style={styles.footerText}>
            Participation in this promotional campaign is completely voluntary.
            Submitting your mobile number does not guarantee a recharge or any
            reward. Rewards, if offered, are provided solely at the discretion
            of The Bharat Evolution in accordance with the campaign rules.
          </Text>
        </View>

        <View style={styles.helpCard}>
  <Text style={styles.helpTitle}>Need Help?</Text>

  <Text style={styles.helpSubtitle}>
    For any questions regarding the Recharge Reward Program, please refer to
    our legal pages or contact our support team.
  </Text>

  <TouchableOpacity
    style={styles.linkCard}
    onPress={() => router.push("/privacy-policy")}
  >
    <MaterialIcons
      name="privacy-tip"
      size={24}
      color="#D90429"
    />

    <View style={styles.linkContent}>
      <Text style={styles.linkTitle}>
        Privacy Policy
      </Text>

      <Text style={styles.linkSubtitle}>
        Learn how your information is collected and used.
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={24}
      color="#999"
    />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.linkCard}
    onPress={() => router.push("/terms-and-conditions")}
  >
    <MaterialIcons
      name="gavel"
      size={24}
      color="#D90429"
    />

    <View style={styles.linkContent}>
      <Text style={styles.linkTitle}>
        General Terms & Conditions
      </Text>

      <Text style={styles.linkSubtitle}>
        Read the complete terms governing the use of the application.
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={24}
      color="#999"
    />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.linkCard}
    onPress={() => router.push("/contact")}
  >
    <MaterialIcons
      name="support-agent"
      size={24}
      color="#D90429"
    />

    <View style={styles.linkContent}>
      <Text style={styles.linkTitle}>
        Contact Support
      </Text>

      <Text style={styles.linkSubtitle}>
        Have questions? Reach out to our editorial team.
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={24}
      color="#999"
    />
  </TouchableOpacity>
</View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#D90429",
  },

  updated: {
    marginTop: 6,
    marginBottom: 20,
    color: "#777",
    fontSize: 13,
  },

  noticeCard: {
    backgroundColor: "#FFF2F2",
    borderLeftWidth: 5,
    borderLeftColor: "#D90429",
    padding: 18,
    borderRadius: 12,
    marginBottom: 25,
  },

  noticeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#D90429",
    marginBottom: 8,
  },

  noticeText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 24,
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 8,
  },

  body: {
    fontSize: 15,
    lineHeight: 26,
    color: "#555",
  },

  footerCard: {
    backgroundColor: "#FFF8E6",
    padding: 20,
    borderRadius: 14,
    marginTop: 35,
  },

  footerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#D97706",
    marginBottom: 10,
  },

  footerText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555",
  },
  helpCard: {
  marginTop: 40,
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 20,
  elevation: 4,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },
},

helpTitle: {
  fontSize: 22,
  fontWeight: "700",
  color: "#D90429",
},

helpSubtitle: {
  color: "#666",
  marginTop: 8,
  marginBottom: 20,
  lineHeight: 22,
},

linkCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FAFAFA",
  padding: 16,
  borderRadius: 14,
  marginBottom: 14,
},

linkContent: {
  flex: 1,
  marginLeft: 14,
},

linkTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#222",
},

linkSubtitle: {
  color: "#777",
  marginTop: 3,
  fontSize: 13,
},
});