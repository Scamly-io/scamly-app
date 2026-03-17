import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. About the Application",
    body: `Welcome to Scamly (Application). The Application is AI-powered fraud detection and scam prevention services that analyse digital communications in real-time to help individuals identify and avoid online scams, phishing attempts, and fraudulent activities (Services).

The Application is operated by SCAMLY PTY LTD (ACN 695941532). Access to and use of the Application, or any of its associated Products or Services, is provided by SCAMLY PTY LTD. Please read these terms and conditions (Terms) carefully. By using, browsing and/or reading the Application, this signifies that you have read, understood and agree to be bound by the Terms. If you do not agree with the Terms, you must cease usage of the Application, or any of Services, immediately.

SCAMLY PTY LTD reserves the right to review and change any of the Terms by updating this page at its sole discretion. When SCAMLY PTY LTD updates the Terms, it will use reasonable endeavours to provide you with notice of updates to the Terms. Any changes to the Terms take immediate effect from the date of their publication. Before you continue, we recommend you keep a copy of the Terms for your records.`,
  },
  {
    title: "2. Acceptance of the Terms",
    body: `You accept the Terms by remaining on the Application. You may also accept the Terms by clicking to accept or agree to the Terms where this option is made available to you by SCAMLY PTY LTD in the user interface.`,
  },
  {
    title: "3. Registration to use the Services",
    body: `In order to access the Services, you must first register for an account through the Application (Account).

As part of the registration process, or as part of your continued use of the Services, you may be required to provide personal information about yourself (such as identification or contact details), including:

(a) Email address
(b) Preferred username
(c) Password
(d) Country of residence

You warrant that any information you give to SCAMLY PTY LTD in the course of completing the registration process will always be accurate, correct and up to date.

Once you have completed the registration process, you will be a registered member of the Application (Member) and agree to be bound by the Terms.

You may not use the Services and may not accept the Terms if:

(a) you are not of legal age to form a binding contract with SCAMLY PTY LTD; or
(b) you are a person barred from receiving the Services under the laws of Australia or other countries including the country in which you are resident or from which you use the Services.`,
  },
  {
    title: "4. Your obligations as a Member",
    body: `As a Member, you agree to comply with the following:

(a) you will use the Services only for purposes that are permitted by:
  (i) the Terms; and
  (ii) any applicable law, regulation or generally accepted practices or guidelines in the relevant jurisdictions;

(b) you have the sole responsibility for protecting the confidentiality of your password and/or email address. Use of your password by any other person may result in the immediate cancellation of the Services;

(c) any use of your registration information by any other person, or third parties, is strictly prohibited. You agree to immediately notify SCAMLY PTY LTD of any unauthorised use of your password or email address or any breach of security of which you have become aware;

(d) access and use of the Application is limited, non-transferable and allows for the sole use of the Application by you for the purposes of SCAMLY PTY LTD providing the Services;

(e) you will not use the Services or the Application in connection with any commercial endeavours except those that are specifically endorsed or approved by the management of SCAMLY PTY LTD;

(f) you will not use the Services or Application for any illegal and/or unauthorised use which includes collecting email addresses of Members by electronic or other means for the purpose of sending unsolicited email or unauthorised framing of or linking to the Application;

(g) you agree that commercial advertisements, affiliate links, and other forms of solicitation may be removed from the Application without notice and may result in termination of the Services; and

(h) you acknowledge and agree that any automated use of the Application or its Services is prohibited.`,
  },
  {
    title: "5. Payment",
    body: `All payments made in the course of your use of the Services are made using Stripe. In using the Application, the Services or when making any payment in relation to your use of the Services, you warrant that you have read, understood and agree to be bound by the Stripe terms and conditions which are available on their website.

You acknowledge and agree that where a request for the payment of the Services Fee is returned or denied, for whatever reason, by your financial institution or is unpaid by you for any other reason, then you are liable for any costs, including banking fees and charges, associated with the Services Fee.

You agree and acknowledge that SCAMLY PTY LTD can vary the Services Fee at any time.`,
  },
  {
    title: "6. Refund Policy",
    body: `SCAMLY PTY LTD will only provide you with a refund of the Services Fee in the event they are unable to continue to provide the Services or if the manager of SCAMLY PTY LTD makes a decision, at its absolute discretion, that it is reasonable to do so under the circumstances (Refund).

Any benefits set out in this Terms and Conditions may apply in addition to consumer's rights under the Australian Consumer Law.`,
  },
  {
    title: "7. Copyright and Intellectual Property",
    body: `The Application, the Services and all of the related products of SCAMLY PTY LTD are subject to copyright. The material on the Application is protected by copyright under the laws of Australia and through international treaties.

All trademarks, service marks and trade names are owned, registered and/or licensed by SCAMLY PTY LTD, who grants to you a worldwide, non-exclusive, royalty-free, revocable license whilst you are a Member to:

(a) use the Application pursuant to the Terms;
(b) copy and store the Application and the material contained in the Application in your device's cache memory; and
(c) print pages from the Application for your own personal and non-commercial use.

SCAMLY PTY LTD does not grant you any other rights whatsoever in relation to the Application or the Services. All other rights are expressly reserved by SCAMLY PTY LTD.

You may not, without the prior written permission of SCAMLY PTY LTD and the permission of any other relevant rights owners: broadcast, republish, up-load to a third party, transmit, post, distribute, show or play in public, adapt or change in any way the Services or third party Services for any purpose, unless otherwise provided by these Terms.`,
  },
  {
    title: "8. User-Generated Data and Service Improvements",
    body: `By submitting any content, communications, or data to the Application for analysis (including emails, messages, URLs, or other materials), you grant a perpetual, worldwide, royalty-free, non-exclusive license to use, reproduce, and analyse such submissions in anonymised and aggregated form to improve fraud detection algorithms, train machine learning models, and enhance the Services. All fraud detection patterns, analysis results, and derivative works generated by the Application remain the exclusive property of SCAMLY PTY LTD.`,
  },
  {
    title: "9. Privacy",
    body: `SCAMLY PTY LTD takes your privacy seriously and any information provided through your use of the Application and/or Services are subject to SCAMLY PTY LTD's Privacy Policy, which is available on the Application and at scamly.io/privacy.`,
  },
  {
    title: "10. General Disclaimer",
    body: `Nothing in the Terms limits or excludes any guarantees, warranties, representations or conditions implied or imposed by law, including the Australian Consumer Law (or any liability under them) which by law may not be limited or excluded.

Subject to this clause, and to the extent permitted by law:

(a) all terms, guarantees, warranties, representations or conditions which are not expressly stated in the Terms are excluded; and

(b) SCAMLY PTY LTD will not be liable for any special, indirect or consequential loss or damage, loss of profit or opportunity, or damage to goodwill arising out of or in connection with the Services or these Terms, whether at common law, under contract, tort (including negligence), in equity, pursuant to statute or otherwise.

Use of the Application and the Services is at your own risk. Everything on the Application and the Services is provided to you "as is" and "as available" without warranty or condition of any kind.`,
  },
  {
    title: "11. Limitation of liability",
    body: `SCAMLY PTY LTD's total liability arising out of or in connection with the Services or these Terms, however arising, including under contract, tort (including negligence), in equity, under statute or otherwise, will not exceed the resupply of the Services to you.

You acknowledge and agree that the Application utilises artificial intelligence and machine learning technologies to analyse digital communications and detect potential scams or fraudulent activity. Such technologies are inherently probabilistic and may produce inaccurate, incomplete or false results. SCAMLY PTY LTD does not warrant that the Application will detect all scams, phishing attempts or fraudulent activities, nor that its analysis will be free from error.

You accept sole responsibility for any decisions made in reliance on the Application's outputs and are encouraged to exercise independent judgement before acting on any analysis provided.`,
  },
  {
    title: "12. Termination of Contract",
    body: `The Terms will continue to apply until terminated by either you or by SCAMLY PTY LTD as set out below.

If you want to terminate the Terms, you may do so by:

(a) providing SCAMLY PTY LTD with 1 day's notice of your intention to terminate; and
(b) closing your accounts for all of the services which you use, where SCAMLY PTY LTD has made this option available to you.

Your notice should be sent, in writing, to SCAMLY PTY LTD via the 'Contact Us' link on our homepage.

SCAMLY PTY LTD may at any time, terminate the Terms with you if:

(a) you have breached any provision of the Terms or intend to breach any provision;
(b) SCAMLY PTY LTD is required to do so by law;
(c) the provision of the Services to you by SCAMLY PTY LTD is, in the opinion of SCAMLY PTY LTD, no longer commercially viable.`,
  },
  {
    title: "13. Indemnity",
    body: `You agree to indemnify SCAMLY PTY LTD, its affiliates, employees, agents, contributors, third party content providers and licensors from and against:

(a) all actions, suits, claims, demands, liabilities, costs, expenses, loss and damage (including legal fees on a full indemnity basis) incurred, suffered or arising out of or in connection with your content;

(b) any direct or indirect consequences of you accessing, using or transacting on the Application or attempts to do so; and/or

(c) any breach of the Terms.`,
  },
  {
    title: "14. Dispute Resolution",
    body: `If a dispute arises out of or relates to the Terms, either party may not commence any Tribunal or Court proceedings in relation to the dispute, unless the following clauses have been complied with (except where urgent interlocutory relief is sought).

A party to the Terms claiming a dispute (Dispute) has arisen under the Terms, must give written notice to the other party detailing the nature of the dispute, the desired outcome and the action required to settle the Dispute.

On receipt of that notice (Notice), the parties must:

(a) Within 28 days of the Notice endeavour in good faith to resolve the Dispute expeditiously by negotiation or such other means upon which they may mutually agree;

(b) If for any reason whatsoever, 28 days after the date of the Notice, the Dispute has not been resolved, the Parties must either agree upon selection of a mediator or request that an appropriate mediator be appointed by the Resolution Institute;

(c) The Parties are equally liable for the fees and reasonable expenses of a mediator and the cost of the venue of the mediation;

(d) The mediation will be held in Sydney, Australia.

All communications concerning negotiations made by the Parties arising out of and in connection with this dispute resolution clause are confidential.

If 2 months have elapsed after the start of a mediation of the Dispute and the Dispute has not been resolved, either Party may ask the mediator to terminate the mediation.`,
  },
  {
    title: "15. Venue and Jurisdiction",
    body: `The Services offered by SCAMLY PTY LTD are available to users worldwide. In the event of any dispute arising out of or in relation to the Application or these Terms, you agree that the exclusive venue for resolving any such dispute shall be in the courts of New South Wales, Australia, and you irrevocably submit to the jurisdiction of those courts.`,
  },
  {
    title: "16. Governing Law",
    body: `The Terms are governed by the laws of New South Wales, Australia. Any dispute, controversy, proceeding or claim of whatever nature arising out of or in any way relating to the Terms and the rights created hereby shall be governed, interpreted and construed by, under and pursuant to the laws of New South Wales, Australia, without reference to conflict of law principles.`,
  },
  {
    title: "17. Severance",
    body: `If any part of these Terms is found to be void or unenforceable by a Court of competent jurisdiction, that part shall be severed and the rest of the Terms shall remain in force.`,
  },
  {
    title: "18. Data Protection Compliance",
    body: `The collection, use, storage and disclosure of personal information through the Application complies with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles. Where the Application processes personal data of individuals located in the European Union, SCAMLY PTY LTD will comply with the General Data Protection Regulation (EU) 2016/679 (GDPR), including implementing appropriate technical and organisational measures to ensure data security, providing data breach notifications where required, and facilitating user rights including access, rectification, erasure, data portability and objection to processing.`,
  },
];

export default function Terms() {
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
            Terms of Service
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
            Mobile App Terms and Conditions of Use
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
