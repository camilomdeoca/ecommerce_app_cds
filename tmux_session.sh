#!/usr/bin/env bash

SESSION_NAME="evaluacion_tecnica_cds"
export PATH=$PWD/scripts:$PATH

# Check if the session already exists
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "Session $SESSION_NAME already exists. Attaching to it."
    tmux attach-session -t $SESSION_NAME
else
    tmux new-session -d -s $SESSION_NAME #$DEV_SHELL_CMD

    tmux send-keys -t "${SESSION_NAME}:0.0" "nvim" C-m

    tmux split-window -h -t "$SESSION_NAME:0.0"

    tmux split-window -v -t "$SESSION_NAME:0.1"

    tmux send-keys -t "$SESSION_NAME:0.1" "opencode" C-m

    tmux select-pane -t "$SESSION_NAME:0.0"

    # Attach to the created session
    tmux attach-session -t $SESSION_NAME
fi
