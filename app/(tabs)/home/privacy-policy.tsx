import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "We respect your privacy",
    body: `Scamly Pty Ltd respects your right to privacy and is committed to safeguarding the privacy of our customers and website visitors. This policy sets out how we collect and treat your personal information.

We adhere to the Australian Privacy Principles contained in the Privacy Act 1988 (Cth) and to the extent applicable, the EU General Data Protection Regulation (GDPR).

"Personal information" is information we hold which is identifiable as being about you. This includes information such as your name, email address, identification number, or any other type of information that can reasonably identify an individual, either directly or indirectly.

You may contact us in writing at 81-83 Campbell St, Sydney, New South Wales, 2010 for further information about this Privacy Policy.`,
  },
  {
    title: "1. What personal information is collected",
    body: `Scamly Pty Ltd will, from time to time, receive and store personal information you submit to our website or application, provided to us directly or given to us in other forms. The personal information we collect is limited to your name, email address, date of birth, and country of residence, as well as certain technical information about the device you use to access our services, such as device type, operating system, and browser type.

You may provide basic information such as your name, email address, date of birth, and country of residence to enable us to send you information, provide updates and process your product or service order.

We may collect additional information at other times, including but not limited to, when you provide feedback, when you provide information about your personal or business affairs, change your email preference, respond to surveys and/or promotions, or communicate with our customer support.

Additionally, we may also collect any other information you provide while interacting with us. Where you interact with our AI-powered features, including the AI scan tool, AI chat tool, or contact search tool, data submitted through these features — including photographs, conversation content, and company search queries — may be transmitted to and processed by third-party AI service providers, including OpenAI and Perplexity, for the purpose of delivering those services. By using these features, you consent to your data being processed by these third-party providers in accordance with their respective privacy policies.`,
  },
  {
    title: "2. How we collect your personal information",
    body: `Scamly Pty Ltd collects personal information from you in a variety of ways, including when you interact with us electronically, when you access our website and when we engage in business activities with you. We may receive personal information from third parties. If we do, we will protect it as set out in this Privacy Policy.

By providing us with personal information, you consent to the supply of that information subject to the terms of this Privacy Policy.`,
  },
  {
    title: "3. How we use your personal information",
    body: `Scamly Pty Ltd may use personal information collected from you to provide you with information about our products or services. We may also make you aware of new and additional products, services and opportunities available to you.

Scamly Pty Ltd will use personal information only for the purposes that you consent to. This may include to:

(a) provide you with products and services during the usual course of our business activities;
(b) administer our business activities;
(c) manage, research and develop our products and services;
(d) provide you with information about our products and services;
(e) communicate with you by a variety of measures including, but not limited to, by telephone, email, sms or mail;
(f) investigate any complaints; and
(g) comply with data retention schedules and implement automated deletion procedures in accordance with applicable data protection laws.

If you withhold your personal information, it may not be possible for us to provide you with our products and services or for you to fully access our website.

We may disclose your personal information to comply with a legal requirement, such as a law, regulation, court order, subpoena, warrant, legal proceedings or in response to a law enforcement agency request.

If there is a change of control in our business or a sale or transfer of business assets, we reserve the right to transfer to the extent permissible at law our user databases, together with any personal information and non-personal information contained in those databases.`,
  },
  {
    title: "4. Disclosure of your personal information",
    body: `Scamly Pty Ltd may disclose your personal information to any of our employees, officers, insurers, professional advisers, agents, suppliers or subcontractors insofar as reasonably necessary for the purposes set out in this privacy policy.

If we do disclose your personal information to a third party, we will protect it in accordance with this privacy policy.`,
  },
  {
    title: "5. General Data Protection Regulation (GDPR) for the European Union (EU)",
    body: `Scamly Pty Ltd will comply with the principles of data protection set out in the GDPR for the purpose of fairness, transparency and lawful data collection and use.

We process your personal information as a Processor and/or to the extent that we are a Controller as defined in the GDPR.

We must establish a lawful basis for processing your personal information. The legal basis for which we collect your personal information depends on the data that we collect and how we use it.

We will only collect your personal information with your express consent for a specific purpose and any data collected will be to the extent necessary and not excessive for its purpose. We will keep your data safe and secure.

We will also process your personal information if it is necessary for our legitimate interests, or to fulfil a contractual or legal obligation.

We maintain documented lawful bases for each processing activity under Article 6(1) GDPR, including legitimate interest assessments for fraud detection and cybersecurity services, and explicit consent mechanisms for marketing communications, with Data Processing Agreements available to customers upon request.

We process your personal information if it is necessary to protect your life or in a medical situation, it is necessary to carry out a public function, a task of public interest or if the function has a clear basis in law.

We do not collect or process any personal information from you that is considered "Sensitive Personal Information" under the GDPR, such as personal information relating to your sexual orientation or ethnic origin unless we have obtained your explicit consent, or if it is being collected subject to and in accordance with the GDPR.

You must not provide us with your personal information if you are under the age of 16 without the consent of your parent or someone who has parental authority for you. We do not knowingly collect or process the personal information of children.`,
  },
  {
    title: "6. Your rights under the GDPR",
    body: `If you are an individual residing in the EU, you have certain rights as to how your personal information is obtained and used. Scamly Pty Ltd complies with your rights under the GDPR as to how your personal information is used and controlled if you are an individual residing in the EU.

Except as otherwise provided in the GDPR, you have the following rights:

(a) to be informed how your personal information is being used;
(b) access your personal information (we will provide you with a free copy of it);
(c) to correct your personal information if it is inaccurate or incomplete;
(d) to delete your personal information (also known as "the right to be forgotten");
(e) to restrict processing of your personal information;
(f) to retain and reuse your personal information for your own purposes;
(g) to object to your personal information being used; and
(h) to object against automated decision making and profiling.

Please contact us at any time to exercise your rights under the GDPR at the contact details in this Privacy Policy.

We may ask you to verify your identity before acting on any of your requests.`,
  },
  {
    title: "7. Hosting and International Data Transfers",
    body: `Information that we collect may from time to time be stored, processed in or transferred between parties or sites located in countries outside of Australia. Our primary data storage facilities are located in Australia and Singapore. However, data may be processed globally to optimise application performance and reduce latency for users accessing our software from different regions.

We are headquartered in Australia, however we access servers globally and maintain our primary data storage facilities in Singapore. Transfers to each of these countries will be protected by appropriate safeguards, these include one or more of the following: the use of standard data protection clauses adopted or approved by the European Commission which you can obtain from the European Commission Website; the use of binding corporate rules, a copy of which you can obtain from Scamly Pty Ltd's Data Protection Officer.

The hosting facilities for our website are situated in the United States of America and Sweden. Transfers to each of these countries will be protected by appropriate safeguards.

Our third-party service providers, including those providing analytics, data processing, and user information management tools, are situated in Australia, European Union member states, Singapore, and United States of America. Transfers to each of these countries will be protected by appropriate safeguards.

You acknowledge that personal data that you submit for publication through our website or services may be available, via the internet, around the world. We cannot prevent the use (or misuse) of such personal data by others.`,
  },
  {
    title: "8. Security of your personal information",
    body: `Scamly Pty Ltd is committed to ensuring that the information you provide to us is secure. In order to prevent unauthorised access or disclosure, we have put in place suitable physical, electronic and managerial procedures to safeguard and secure information and protect it from misuse, interference, loss and unauthorised access, modification and disclosure.

Where we employ data processors to process personal information on our behalf, we only do so on the basis that such data processors comply with the requirements under the GDPR and that have adequate technical measures in place to protect personal information against unauthorised use, loss and theft.

The transmission and exchange of information is carried out at your own risk. We will take all reasonable and appropriate technical and organisational measures to protect your personal information in accordance with our obligations under the Privacy Act 1988 (Cth) and the GDPR.

In the event of a personal data breach, we will notify the relevant supervisory authority within 72 hours of becoming aware of the breach, and will notify affected individuals without undue delay where the breach is likely to result in a high risk to their rights and freedoms.`,
  },
  {
    title: "9. Access to your personal information",
    body: `You may request details of personal information that we hold about you in accordance with the provisions of the Privacy Act 1988 (Cth), and to the extent applicable the EU GDPR. If you would like a copy of the information which we hold about you or believe that any information we hold on you is inaccurate, out of date, incomplete, irrelevant or misleading, please email us at support@scamly.io.

We reserve the right to refuse to provide you with information that we hold about you, in certain circumstances set out in the Privacy Act or any other applicable law.`,
  },
  {
    title: "10. Complaints about privacy",
    body: `If you have any complaints about our privacy practices, please feel free to send in details of your complaints to support@scamly.io. We take complaints very seriously and will respond shortly after receiving written notice of your complaint.`,
  },
  {
    title: "11. Changes to Privacy Policy",
    body: `Please be aware that we may change this Privacy Policy in the future. We may modify this Policy at any time, in our sole discretion and all modifications will be effective immediately upon our posting of the modifications on our website or notice board. Please check back from time to time to review our Privacy Policy.`,
  },
  {
    title: "12. Website",
    body: `When you come to our website (www.scamly.io), we may collect certain information such as browser type, operating system, website visited immediately before coming to our site, etc. This information is used in an aggregated manner to analyse how people use our site, such that we can improve our service.

Cookies: We may from time to time use cookies on our website. Cookies are very small files which a website uses to identify you when you come back to the site and to store details about your use of the site. Our website uses the following categories of cookies: necessary cookies that are essential for the website to function; functional cookies that remember your preferences and settings; analytics cookies that help us understand how visitors interact with our website and improve our service; and cookies that share data with Google for analytics and performance purposes.

Third party sites: Our site may from time to time have links to other websites not owned or controlled by us. These links are meant for your convenience only. Links to third party websites do not constitute sponsorship or endorsement or approval of these websites.`,
  },
  {
    title: "Effective date",
    body: `This policy is effective from 17 Mar 2026.`,
  },
];

export default function PrivacyPolicy() {
  const { colors } = useTheme();

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Privacy Policy
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.company, { color: colors.textSecondary }]}>
            Scamly Pty Ltd{"\n"}81-83 Campbell Street{"\n"}Sydney NSW 2010
          </Text>

          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Privacy Policy
          </Text>

          {SECTIONS.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
                {section.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    flex: 1,
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  company: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
