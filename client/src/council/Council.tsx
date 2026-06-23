import type { Character, Meeting, Topic } from "@shared/ModelTypes";
import { isSpeakerMessage } from "@shared/ModelTypes";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import Overlay from "@main/overlay/Overlay";
import CouncilOverlays from "./overlays/CouncilOverlays";
import Loading from "@main/Loading";
import Output from "./output/Output";
import ConversationControls from "./ConversationControls";
import HumanInput from "./humanInput/HumanInput";
import { getParticipationPhase } from "./humanInput/participationPhase";
import { useDocumentVisibility } from "@/utils";
import { useTranslation } from "react-i18next";
import { useCouncilMachine } from "./hooks/useCouncilMachine";
import { getMeeting } from "@api/getMeeting.js";
import ReplayModeBanner from "./ReplayModeBanner";
import { useCouncilSettings } from "@/settings/useCouncilSettings";
import MeetingMetaAgent from "@museum/metaAgent/MeetingMetaAgent";

interface CouncilProps {
  liveKey: string | null;
  setliveKey: (key: string) => void;
  topic: Topic | null;
  setTopic: (topic: Topic) => void;
  setUnrecoverableError: (message: string) => void;
  setConnectionError: (error: boolean) => void;
  connectionError: boolean;
  meetingAudioContext: React.RefObject<AudioContext | null>;
  setMeetingPlaybackPaused: (paused: boolean) => void;
  currentSpeakerId: string;
  setCurrentSpeakerId: (id: string) => void;
  isPaused: boolean;
  setPaused: (paused: boolean) => void;
}

function Council({
  liveKey,
  setliveKey,
  topic,
  setTopic,
  setUnrecoverableError,
  setConnectionError,
  connectionError,
  meetingAudioContext,
  setMeetingPlaybackPaused,
  currentSpeakerId,
  setCurrentSpeakerId,
  isPaused,
  setPaused,
}: CouncilProps) {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { t, i18n } = useTranslation();
  const { isMuseumMode, pushToTalkMode } = useCouncilSettings();

  const navigate = useNavigate();
  const location = useLocation();

  const currentMeetingId = Number(meetingId);

  const [participants, setParticipants] = useState<Character[]>([]);
  const [replayManifest, setReplayManifest] = useState<Meeting | null>(null);
  const [humanName, setHumanName] = useState("");
  const [metaAgentActive, setMetaAgentActive] = useState(false);

  // Abort in-flight GET when deps change or on unmount (StrictMode-safe); same pattern as TanStack Query/SWR cancellation.
  useEffect(() => {
    if (!meetingId || !/^\d+$/.test(meetingId)) {
      navigate("/");
      return;
    }

    setHumanName("");
    const ac = new AbortController();
    void (async () => {
      try {
        const meeting = await getMeeting({
          meetingId: currentMeetingId,
          liveKey,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!liveKey) {
          setReplayManifest(meeting);
        }
        setTopic(meeting.topic);
        setParticipants(meeting.characters);
        const storedName = meeting.state?.humanName?.trim();
        if (storedName && storedName.length > 0) {
          setHumanName(storedName);
        }
      } catch (error) {
        if (ac.signal.aborted) return;
        console.error(error);
        const msg =
          error instanceof Error && error.message.trim().length > 0 ? error.message : t("error.1");
        setUnrecoverableError(msg);
      }
    })();
    return () => ac.abort();
  }, [liveKey, meetingId, currentMeetingId, navigate, setUnrecoverableError]);

  const { state, actions } = useCouncilMachine({
    currentMeetingId,
    liveKey: liveKey ?? undefined,
    setliveKey,
    replayManifest: liveKey ? null : replayManifest,
    topic,
    participants,
    humanName,
    setHumanName,
    meetingAudioContext,
    setUnrecoverableError,
    setConnectionError,
    connectionError,
    isPaused,
    setPaused,
    setMeetingPlaybackPaused,
    metaAgentActive,
  });

  const {
    councilState,
    textMessages,
    audioMessages,
    playingNowIndex,
    playNextIndex,
    activeOverlay,
    summary,
    isRaisedHand,
    canGoBack,
    canGoForward,
    canRaiseHand,
    currentSnippetIndex,
    isMuted,
    canExtendMeeting,
  } = state;

  const {
    tryToFindTextAndAudio,
    handleOnFinishedPlaying,
    handleOnSkipBackward,
    handleOnSkipForward,
    handleOnSubmitHumanMessage,
    handleOnContinueMeetingLonger,
    handleOnAttemptResume,
    handleOnGenerateSummary,
    handleHumanNameEntered,
    handleOnRaiseHand,
    cancelOverlay,
    setCurrentSnippetIndex,
    toggleMute,
  } = actions;

  useEffect(() => {
    if (councilState !== "human_panelist") return;

    const pendingMessage = textMessages[playNextIndex];
    if (pendingMessage?.type !== "awaiting_human_panelist") {
      setUnrecoverableError(
        "Internal state mismatch: human_panelist state requires an awaiting_human_panelist message."
      );
    }
  }, [councilState, textMessages, playNextIndex, setUnrecoverableError]);

  // Sync current speaker ID to Main for Forest zoom (always-mounted sibling scene).
  useEffect(() => {
    if (metaAgentActive) {
      setCurrentSpeakerId(participants[0]?.id?.toLowerCase() ?? "");
      return;
    }

    if (councilState === "loading") {
      setCurrentSpeakerId("");
      return;
    }

    if (councilState === "human_input") {
      setCurrentSpeakerId("");
      return;
    }

    if (councilState === "human_panelist") {
      const pendingMessage = textMessages[playNextIndex];
      if (pendingMessage?.type === "awaiting_human_panelist") {
        setCurrentSpeakerId(pendingMessage.speaker.toLowerCase());
      } else {
        setCurrentSpeakerId("");
      }
      return;
    }

    if (councilState === "summary") {
      setCurrentSpeakerId("");
      return;
    }

    if (playingNowIndex >= 0) {
      const activeMessage = textMessages[playingNowIndex];
      if (activeMessage && isSpeakerMessage(activeMessage)) {
        setCurrentSpeakerId(activeMessage.speaker.toLowerCase());
      }
    }
  }, [playingNowIndex, textMessages, setCurrentSpeakerId, councilState, playNextIndex, metaAgentActive, participants]);

  // Derived UI State
  const participationPhase = getParticipationPhase(councilState, textMessages, playingNowIndex);
  const isButtonMuseumMode = useMemo(
    () => isMuseumMode && pushToTalkMode,
    [isMuseumMode, pushToTalkMode]
  );
  const isWaitingToInterject = isRaisedHand && councilState !== 'human_input';
  const controlsVisible = (
    councilState === "playing" ||
    councilState === "waiting" ||
    (councilState === "summary" && tryToFindTextAndAudio())
  );

  const isDocumentVisible = useDocumentVisibility();

  useEffect(() => {
    if (!isDocumentVisible && !isPaused && !metaAgentActive) {
      setPaused(true);
    }
  }, [isDocumentVisible, isPaused, metaAgentActive, setPaused]);

  return (
    <>
      {councilState === 'loading' && <Loading />}
      {pushToTalkMode && liveKey && (
        <MeetingMetaAgent
          liveKey={liveKey}
          language={i18n.language}
          participationPhase={participationPhase}
          setMeetingPlaybackPaused={setMeetingPlaybackPaused}
          metaAgentActive={metaAgentActive}
          setMetaAgentActive={setMetaAgentActive}
          onRestartMeeting={() => navigate("/")}
          councilState={councilState}
          topic={topic}
          participants={participants}
          currentSpeakerName={participants.find((p) => p.id === currentSpeakerId)?.name ?? ""}
          humanName={humanName}
        />
      )}
      {liveKey && participationPhase !== "off" && (
        <HumanInput
          phase={participationPhase}
          liveKey={liveKey}
          isPanelist={councilState === 'human_panelist'}
          currentSpeakerName={participants.find(p => p.id === currentSpeakerId)?.name || ""}
          onSubmitHumanMessage={handleOnSubmitHumanMessage}
          isButtonMuseumMode={isButtonMuseumMode}
        />
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", overflow: "visible" }}>
        {!metaAgentActive && (
          <Output
            textMessages={textMessages}
            audioMessages={audioMessages}
            playingNowIndex={playingNowIndex}
            councilState={councilState}
            isMuted={isMuted}
            isPaused={isPaused}
            currentSnippetIndex={currentSnippetIndex}
            setCurrentSnippetIndex={setCurrentSnippetIndex}
            meetingAudioContext={meetingAudioContext}
            handleOnFinishedPlaying={handleOnFinishedPlaying}
          />
        )}
        {controlsVisible && !metaAgentActive && (
          <ConversationControls
            hidden={isMuseumMode}
            onSkipBackward={handleOnSkipBackward}
            onSkipForward={handleOnSkipForward}
            onRaiseHand={handleOnRaiseHand}
            isRaisedHand={isRaisedHand}
            isWaitingToInterject={isWaitingToInterject}
            isMuted={isMuted}
            onMuteUnmute={toggleMute}
            isPaused={isPaused}
            onPausePlay={() => setPaused(!isPaused)}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            canRaiseHand={canRaiseHand}
            onTopOfOverlay={activeOverlay === "summary" && location.hash === ""}
            humanName={humanName}
          />
        )}
        {replayManifest && (
          <ReplayModeBanner
            meeting={replayManifest}
            isPaused={isPaused}
            visible={!liveKey}
          />
        )}
      </div>
      <Overlay isActive={activeOverlay !== null}>
        {activeOverlay !== null && (
          <CouncilOverlays
            activeOverlay={activeOverlay}
            onContinue={handleOnContinueMeetingLonger}
            onAttemptResume={handleOnAttemptResume}
            onWrapItUp={handleOnGenerateSummary}
            proceedWithHumanName={handleHumanNameEntered}
            canExtendMeeting={canExtendMeeting}
            cancelOverlay={cancelOverlay}
            summary={{ text: summary?.text || "" }}
            meetingId={currentMeetingId}
            participants={participants}
          />
        )}
      </Overlay>
    </>
  );
}

export default Council;
